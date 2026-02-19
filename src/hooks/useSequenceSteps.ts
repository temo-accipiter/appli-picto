// src/hooks/useSequenceSteps.ts
// CRUD étapes pour une séquence (relation 1:N)
//
// ⚠️ DB-FIRST STRICT
// Invariants garantis côté DB (le front ne les vérifie PAS) :
//   - Minimum 2 étapes → trigger sequences_enforce_min_two_steps (DEFERRABLE)
//   - UNIQUE(sequence_id, step_card_id) → pas de doublon de carte dans une séquence
//   - UNIQUE(sequence_id, position) DEFERRABLE → permet reorder transactionnel
//   - Ownership cartes perso → trigger vérifie même account_id que la séquence
//
// ⚠️ SYSTÈME SÉQUENÇAGE — NE PAS FUSIONNER AVEC
//   - Système planning (timelines, slots) → structures distinctes
//   - Système jetons (tokens) → métriques distinctes

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import type { Database } from '@/types/supabase'

export type SequenceStep = Database['public']['Tables']['sequence_steps']['Row']

interface ActionResult {
  error: Error | null
}

interface UseSequenceStepsReturn {
  /** Étapes de la séquence, triées par position ASC */
  steps: SequenceStep[]
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture */
  error: Error | null
  /**
   * Ajouter une étape à la séquence.
   * Position = max actuel + 1 (la DB gère UNIQUE DEFERRABLE pour le reorder).
   * ⚠️ La DB bloque si la carte est déjà dans la séquence (UNIQUE step_card_id).
   */
  addStep: (stepCardId: string) => Promise<ActionResult>
  /**
   * Supprimer une étape.
   * ⚠️ La DB bloque si c'est la 2ème étape et qu'il en resterait <2 (trigger min).
   */
  removeStep: (stepId: string) => Promise<ActionResult>
  /**
   * Déplacer une étape à une nouvelle position.
   * Stratégie : échange des positions (A↔B) en 2 UPDATE séquentiels.
   * Le UNIQUE DEFERRABLE permet des positions temporairement identiques dans une transaction.
   */
  moveStep: (stepId: string, newPosition: number) => Promise<ActionResult>
  /** Rafraîchir depuis la DB */
  refresh: () => void
}

/**
 * CRUD étapes pour une séquence.
 *
 * @param sequenceId - ID de la séquence (null = pas d'appel DB)
 *
 * @example
 * ```tsx
 * const { steps, addStep, removeStep } = useSequenceSteps(sequence?.id ?? null)
 * ```
 */
export default function useSequenceSteps(
  sequenceId: string | null
): UseSequenceStepsReturn {
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Pas de séquence → état vide immédiat
    if (!sequenceId) {
      setSteps([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchSteps = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('sequence_steps')
          .select('*')
          .eq('sequence_id', sequenceId)
          .order('position', { ascending: true })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        setSteps(data ?? [])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useSequenceSteps] Erreur lecture étapes:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchSteps()

    return () => {
      controller.abort()
    }
  }, [sequenceId, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /** Ajoute une étape en dernière position */
  const addStep = useCallback(
    async (stepCardId: string): Promise<ActionResult> => {
      if (!sequenceId) return { error: new Error('Pas de séquence active') }

      // Position = nombre d'étapes actuelles (0-indexed)
      const nextPosition = steps.length

      const { error: insertError } = await supabase
        .from('sequence_steps')
        .insert({
          sequence_id: sequenceId,
          step_card_id: stepCardId,
          position: nextPosition,
        })

      if (!insertError) refresh()
      return { error: insertError as Error | null }
    },
    [sequenceId, steps.length, refresh]
  )

  const removeStep = useCallback(
    async (stepId: string): Promise<ActionResult> => {
      if (!sequenceId) return { error: new Error('Pas de séquence active') }

      const { error: deleteError } = await supabase
        .from('sequence_steps')
        .delete()
        .eq('id', stepId)
        .eq('sequence_id', sequenceId)

      if (!deleteError) refresh()
      return { error: deleteError as Error | null }
    },
    [sequenceId, refresh]
  )

  /**
   * Échange les positions de l'étape visée avec celle qui occupe newPosition.
   * Si aucune étape n'occupe newPosition, met à jour directement.
   */
  const moveStep = useCallback(
    async (stepId: string, newPosition: number): Promise<ActionResult> => {
      if (!sequenceId) return { error: new Error('Pas de séquence active') }

      const movingStep = steps.find(s => s.id === stepId)
      if (!movingStep) return { error: new Error('Étape introuvable') }

      const targetStep = steps.find(s => s.position === newPosition)

      if (!targetStep) {
        // Pas d'étape à cet endroit — simple UPDATE de position
        const { error: updateError } = await supabase
          .from('sequence_steps')
          .update({
            position: newPosition,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stepId)

        if (!updateError) refresh()
        return { error: updateError as Error | null }
      }

      // Échange : on assigne temporairement une position hors-plage (DEFERRABLE tolère)
      // puis on fait l'échange en 2 UPDATE
      const tempPosition = -1

      // 1. Déplacer l'étape visée hors-plage (position temporaire invalide mais différente)
      const { error: e1 } = await supabase
        .from('sequence_steps')
        .update({
          position: tempPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stepId)
      if (e1) return { error: e1 as Error }

      // 2. Déplacer l'étape cible à l'ancienne position de l'étape visée
      const { error: e2 } = await supabase
        .from('sequence_steps')
        .update({
          position: movingStep.position,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetStep.id)
      if (e2) return { error: e2 as Error }

      // 3. Déplacer l'étape visée à sa nouvelle position
      const { error: e3 } = await supabase
        .from('sequence_steps')
        .update({ position: newPosition, updated_at: new Date().toISOString() })
        .eq('id', stepId)
      if (e3) return { error: e3 as Error }

      refresh()
      return { error: null }
    },
    [sequenceId, steps, refresh]
  )

  return {
    steps,
    loading,
    error,
    addStep,
    removeStep,
    moveStep,
    refresh,
  }
}
