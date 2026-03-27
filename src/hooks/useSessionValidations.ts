// src/hooks/useSessionValidations.ts
// Lecture et insertion des validations d'une session (étapes cochées)
//
// ⚠️ DB-FIRST STRICT
// Invariants garantis côté DB (le front ne les vérifie PAS) :
//   - UNIQUE (session_id, slot_id) → idempotence : valider deux fois = même résultat
//   - Validations step-only (trigger session_validations_enforce_integrity)
//     → le front ne peut pas valider un slot de kind 'reward'
//   - Slot non-vide : card_id NOT NULL obligatoire au moment de la validation
//   - Slot appartient à la timeline de la session (vérifié par trigger)
//   - Session doit être active (active_preview ou active_started) au moment de la validation
//
// ⚠️ validated_at
// Ce champ est AUDIT-ONLY — ne jamais l'utiliser dans la logique métier (tri, comptage, etc.)
// La progression se base sur COUNT(session_validations) uniquement.
//
// ⚠️ FUSION MONOTONE (multi-appareils)
// Les validations sont une union ensembliste.
// La progression ne peut jamais régresser (UNIQUE + trigger).
// La grille de jetons affichée est toujours le maximum connu.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import type { Database } from '@/types/supabase'
import * as visitorSessionsDB from '@/utils/visitor/sessionsDB'

export type SessionValidation =
  Database['public']['Tables']['session_validations']['Row']

// Type unifié : SessionValidation DB ou visitor (structures identiques)
type _UnifiedSessionValidation =
  | SessionValidation
  | visitorSessionsDB.VisitorSessionValidation

interface ActionResult {
  error: Error | null
}

interface UseSessionValidationsReturn {
  /** Ensemble des validations pour cette session (étapes cochées) */
  validations: SessionValidation[]
  /** Ensemble des slot_id validés (pour affichage rapide des cases cochées) */
  validatedSlotIds: Set<string>
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture (DB ou réseau) */
  error: Error | null
  /**
   * Valider un slot (insérer une ligne session_validations).
   * ⚠️ Idempotent : valider un slot déjà validé ne retourne pas d'erreur (UNIQUE ignorée).
   * ⚠️ La DB gère les transitions : preview→started (1ère validation), started→completed (snapshot atteint).
   */
  validate: (slotId: string) => Promise<ActionResult>
  /** Rafraîchir la liste des validations depuis la DB */
  refresh: () => void
}

/**
 * Lecture et insertion des validations pour une session active.
 *
 * Ce hook expose :
 * - La liste complète des validations (pour fusion monotone multi-appareils)
 * - Un Set des slot_id validés (pour affichage rapide O(1))
 * - La fonction `validate(slotId)` pour cocher une étape
 *
 * @param sessionId - ID de la session active (null = pas d'appel DB)
 *
 * @example
 * ```tsx
 * const { validatedSlotIds, validate } = useSessionValidations(session?.id ?? null)
 * const isDone = validatedSlotIds.has(slot.id)
 * await validate(slot.id)
 * ```
 */
export default function useSessionValidations(
  sessionId: string | null
): UseSessionValidationsReturn {
  const [validations, setValidations] = useState<SessionValidation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!sessionId) {
      setValidations([])
      setLoading(false)
      setError(null)
      return
    }

    // VISITOR mode → Charger depuis IndexedDB (ZÉRO appel Supabase)
    // Détection : sessionId commence par "visitor-"
    if (sessionId.startsWith('visitor-')) {
      setLoading(true)
      setError(null)

      const loadVisitorValidations = async () => {
        try {
          const visitorValidations =
            await visitorSessionsDB.getSessionValidations(sessionId)

          // Convertir en format SessionValidation (structure identique)
          const formattedValidations: SessionValidation[] =
            visitorValidations.map(v => ({
              id: v.id,
              session_id: v.session_id,
              slot_id: v.slot_id,
              validated_at: new Date(v.validated_at).toISOString(),
              created_at: new Date(v.validated_at).toISOString(), // Visitor : created_at = validated_at
            }))

          setValidations(formattedValidations)
        } catch (err) {
          console.error(
            '[useSessionValidations] Erreur chargement validations visitor:',
            err
          )
          setError(err as Error)
        } finally {
          setLoading(false)
        }
      }

      void loadVisitorValidations()
      return
    }

    // AUTH mode → Charger depuis Supabase
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchValidations = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('session_validations')
          .select('*')
          .eq('session_id', sessionId)
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        setValidations(data ?? [])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error(
          '[useSessionValidations] Erreur lecture validations:',
          err
        )
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchValidations()

    return () => {
      controller.abort()
    }
  }, [sessionId, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /**
   * Valider un slot (cocher une étape).
   *
   * Idempotent : si le slot est déjà validé (UNIQUE violation code 23505),
   * on ignore l'erreur et on considère l'opération réussie.
   *
   * La DB se charge des transitions d'état (preview→started→completed).
   */
  const validate = useCallback(
    async (slotId: string): Promise<ActionResult> => {
      if (!sessionId) {
        return { error: new Error('Aucune session active') }
      }

      // VISITOR mode → Utiliser IndexedDB (pas de Supabase)
      if (sessionId.startsWith('visitor-')) {
        try {
          await visitorSessionsDB.validateSlot(sessionId, slotId)
          refresh()
          return { error: null }
        } catch (err) {
          // Idempotent : si erreur de doublon, ignorer
          if (
            err instanceof Error &&
            err.message.includes('unique') // IndexedDB unique constraint
          ) {
            refresh()
            return { error: null }
          }
          return { error: err as Error }
        }
      }

      // AUTH mode → Utiliser Supabase
      const { error: insertError } = await supabase
        .from('session_validations')
        .insert({
          session_id: sessionId,
          slot_id: slotId,
        })

      // Code 23505 = UNIQUE violation → doublon idempotent, pas une vraie erreur
      if (insertError && insertError.code === '23505') {
        refresh()
        return { error: null }
      }

      if (!insertError) refresh()
      return { error: insertError as Error | null }
    },
    [sessionId, refresh]
  )

  // Set des slot_id validés — calculé une fois depuis les validations
  const validatedSlotIds = new Set(validations.map(v => v.slot_id))

  return {
    validations,
    validatedSlotIds,
    loading,
    error,
    validate,
    refresh,
  }
}
