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

import { useState, useEffect, useCallback } from 'react'
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
   * Réinitialiser la session courante (epoch++, state revient à active_preview, validations effacées).
   * ⚠️ Le changement ne s'applique qu'au prochain Chargement du Contexte Tableau (anti-choc).
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

  useEffect(() => {
    // Prérequis : les deux IDs doivent être présents
    if (!childProfileId || !timelineId) {
      setSession(null)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
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
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchSession()

    return () => {
      controller.abort()
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
   * Réinitialiser la session courante.
   * ⚠️ Action réservée à l'adulte (depuis l'Édition).
   * La réinitialisation passe par la suppression et la recréation (epoch++ géré par DB trigger).
   */
  const resetSession = useCallback(async (): Promise<ActionResult> => {
    if (!session) {
      return { error: new Error('Aucune session à réinitialiser') }
    }

    // Supprimer la session courante (CASCADE supprime aussi les session_validations)
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', session.id)

    if (deleteError) return { error: deleteError as Error | null }

    // Recréer une session fraîche — la DB fixe epoch = MAX(ancien) + 1 via trigger
    const { error: insertError } = await supabase.from('sessions').insert({
      child_profile_id: session.child_profile_id,
      timeline_id: session.timeline_id,
      state: 'active_preview',
    })

    if (!insertError) refresh()
    return { error: insertError as Error | null }
  }, [session, refresh])

  return {
    session,
    loading,
    error,
    createSession,
    resetSession,
    refresh,
  }
}
