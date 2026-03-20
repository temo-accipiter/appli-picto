// src/hooks/useSessions.ts
// Gestion de la session active pour un profil enfant + timeline (relation 1:1 active)
//
// ⚠️ DB-FIRST STRICT
// Invariants garantis côté DB (le front ne les vérifie PAS) :
//   - UNIQUE (child_profile_id, timeline_id) WHERE state IN ('active_preview', 'active_started')
//     → une seule session active par (profil, timeline)
//   - Transitions d'état strictes (trigger validate_session_state_transition)
//     → active_preview → active_started → completed (jamais de retour en arrière)
//   - Epoch monotone (triggers ensure_epoch_monotone + prevent_epoch_decrement)
//     → l'epoch ne peut que croître
//   - steps_total_snapshot fixé à la 1ère validation (jamais modifiable ensuite)
//
// ⚠️ PROGRESSION
// La progression est toujours calculée depuis :
//   - numérateur : COUNT(session_validations) pour cette session
//   - dénominateur : sessions.steps_total_snapshot (snapshot immuable)
// JAMAIS de recomptage live des slots.
//
// ⚠️ EPOCH / MULTI-APPAREILS
// Si epoch_local < epoch_DB : état local obsolète → réalignement au prochain Chargement Tableau.
// Cette logique est gérée dans le composant consommateur, pas dans ce hook.

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import type { Database } from '@/types/supabase'

export type Session = Database['public']['Tables']['sessions']['Row']
export type SessionState = Database['public']['Enums']['session_state']

interface ActionResult {
  error: Error | null
}

interface UseSessionsReturn {
  /** Session active (active_preview ou active_started) ou session terminée (completed) pour ce profil+timeline */
  session: Session | null
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture (DB ou réseau) */
  error: Error | null
  /**
   * Créer une nouvelle session (state = active_preview, epoch = 1).
   * ⚠️ Ne pas appeler si une session active existe déjà — la DB retournerait une erreur UNIQUE.
   * Appeler seulement après avoir vérifié que session === null.
   */
  createSession: () => Promise<ActionResult>
  /**
   * Hard Reset : Supprime TOUTES les validations et reset le snapshot.
   * ⚠️ Disponible uniquement pour une session active_started.
   * ⚠️ Le changement ne s'applique qu'au prochain Chargement du Contexte Tableau (anti-choc).
   * ⚠️ L'enfant repartira de zéro (toutes les cartes décochées).
   * ⚠️ La session reste 'active_started' mais avec 0 validations.
   * Cette action est réservée à l'adulte en Édition.
   */
  resetSession: () => Promise<ActionResult>
  /** Rafraîchir l'état de la session depuis la DB */
  refresh: () => void
}

/**
 * Gestion de la session active pour un profil enfant + timeline.
 *
 * Logique de chargement :
 * 1. Cherche une session active (state = 'active_preview' ou 'active_started')
 * 2. Si aucune session active, cherche la dernière session 'completed'
 * 3. Si aucune session du tout → session = null → appeler createSession()
 *
 * @param childProfileId - ID du profil enfant actif (null = pas d'appel DB)
 * @param timelineId - ID de la timeline active (null = pas d'appel DB)
 *
 * @example
 * ```tsx
 * const { session, loading, createSession } = useSessions(activeChildId, timeline?.id ?? null)
 * if (!loading && !session) await createSession()
 * ```
 */
export default function useSessions(
  childProfileId: string | null,
  timelineId: string | null
): UseSessionsReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const previousContextKeyRef = useRef<string | null>(null)
  const currentSessionRef = useRef<Session | null>(null)

  useEffect(() => {
    currentSessionRef.current = session
  }, [session])

  useEffect(() => {
    // Prérequis : les deux IDs doivent être présents
    if (!childProfileId || !timelineId) {
      previousContextKeyRef.current = null
      setSession(null)
      setLoading(false)
      setError(null)
      return
    }

    // VISITOR mode → ZÉRO appel DB (profil local uniquement)
    if (childProfileId === 'visitor-local') {
      previousContextKeyRef.current = null
      setSession(null)
      setLoading(false)
      setError(null)
      return
    }

    const contextKey = `${childProfileId}:${timelineId}`
    const isContextChange = previousContextKeyRef.current !== contextKey
    previousContextKeyRef.current = contextKey

    const controller = new AbortController()
    if (isContextChange) {
      setSession(null)
      setLoading(true)
    } else if (currentSessionRef.current === null) {
      setLoading(true)
    }
    setError(null)

    const fetchSession = async () => {
      try {
        // 1. Cherche d'abord une session active (preview ou started)
        const { data: activeData, error: activeError } = await supabase
          .from('sessions')
          .select('*')
          .eq('child_profile_id', childProfileId)
          .eq('timeline_id', timelineId)
          .in('state', ['active_preview', 'active_started'])
          .abortSignal(controller.signal)
          .maybeSingle()

        if (controller.signal.aborted) return
        if (activeError) throw activeError

        if (activeData) {
          setSession(activeData)
          return
        }

        // 2. Aucune session active → cherche la dernière session terminée
        const { data: completedData, error: completedError } = await supabase
          .from('sessions')
          .select('*')
          .eq('child_profile_id', childProfileId)
          .eq('timeline_id', timelineId)
          .eq('state', 'completed')
          .order('completed_at', { ascending: false })
          .abortSignal(controller.signal)
          .limit(1)
          .maybeSingle()

        if (controller.signal.aborted) return
        if (completedError) throw completedError

        // completed ou null (aucune session du tout)
        setSession(completedData)
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useSessions] Erreur lecture session:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void fetchSession()

    // 🆕 REALTIME : Abonnement aux changements de session (epoch++, snapshot, state)
    // Propagation automatique DB → Frontend sans F5 (Soft Sync temps réel)
    const channel = supabase
      .channel(`session:${childProfileId}:${timelineId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `child_profile_id=eq.${childProfileId}`,
        },
        payload => {
          const updatedSession = payload.new as Session

          // Vérifier que c'est bien la session de cette timeline
          if (updatedSession.timeline_id === timelineId) {
            console.log(
              '[useSessions] Realtime UPDATE détecté:',
              'epoch',
              currentSessionRef.current?.epoch,
              '→',
              updatedSession.epoch,
              '| snapshot',
              currentSessionRef.current?.steps_total_snapshot,
              '→',
              updatedSession.steps_total_snapshot
            )

            // Mise à jour immédiate du state React
            // → Déclenche useEffect epoch detection dans Tableau.tsx
            setSession(updatedSession)
          }
        }
      )
      .subscribe()

    return () => {
      controller.abort()
      // Cleanup Realtime : unsubscribe au démontage
      void supabase.removeChannel(channel)
    }
  }, [childProfileId, timelineId, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /**
   * Créer une nouvelle session en état 'active_preview'.
   * La DB fixera automatiquement l'epoch et les timestamps.
   */
  const createSession = useCallback(async (): Promise<ActionResult> => {
    if (!childProfileId || !timelineId) {
      return { error: new Error('Profil ou timeline manquant') }
    }

    const { error: insertError } = await supabase.from('sessions').insert({
      child_profile_id: childProfileId,
      timeline_id: timelineId,
      state: 'active_preview',
    })

    if (!insertError) refresh()
    return { error: insertError as Error | null }
  }, [childProfileId, timelineId, refresh])

  /**
   * Réinitialiser la progression d'une session active (Hard Reset).
   * ⚠️ Action réservée à l'adulte (depuis l'Édition).
   * ⚠️ La DB reste source de vérité via hard_reset_timeline_session().
   *
   * Cette fonction supprime TOUTES les validations et reset le snapshot.
   * La session reste 'active_started' mais avec 0 validations.
   * L'enfant repartira de zéro au prochain chargement du Contexte Tableau.
   */
  const resetSession = useCallback(async (): Promise<ActionResult> => {
    if (!timelineId || !session || session.state !== 'active_started') {
      return { error: new Error('Aucune progression à réinitialiser') }
    }

    const { error: resetError } = await supabase.rpc(
      'hard_reset_timeline_session',
      {
        p_timeline_id: timelineId,
      }
    )

    if (resetError) {
      return { error: resetError as Error | null }
    }

    refresh()
    return { error: null }
  }, [session, timelineId, refresh])

  return {
    session,
    loading,
    error,
    createSession,
    resetSession,
    refresh,
  }
}
