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
   * Le backend remplace atomiquement la liste complète des étapes.
   */
  addStep: (stepCardId: string) => Promise<ActionResult>
  /**
   * Supprimer une étape.
   * Le backend remplace atomiquement la liste complète des étapes.
   */
  removeStep: (stepId: string) => Promise<ActionResult>
  /**
   * Déplacer une étape à une nouvelle position.
   * Le backend remplace atomiquement la liste complète des étapes.
   */
  moveStep: (stepId: string, newPosition: number) => Promise<ActionResult>
  /** Rafraîchir depuis la DB */
  refresh: () => void
}

/**
 * CRUD étapes pour une séquence.
 *
 * @param sequenceId - ID de la séquence (null = pas d'appel DB)
 * @param enabled - Si false, skip toute exécution (pattern adapter routing)
 *
 * @example
 * ```tsx
 * const { steps, addStep, removeStep } = useSequenceSteps(sequence?.id ?? null)
 * ```
 */
export default function useSequenceSteps(
  sequenceId: string | null,
  enabled: boolean = true
): UseSequenceStepsReturn {
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // ⚠️ GUARD Ticket 3 : Pattern enabled pour adapter routing
    // Si enabled = false → hook inactif (utilisé par adapter Visitor/cloud)
    if (!enabled) {
      setLoading(false)
      return
    }

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
  }, [sequenceId, refreshKey, enabled])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const replaceSteps = useCallback(
    async (nextStepCardIds: string[]): Promise<ActionResult> => {
      if (!sequenceId) return { error: new Error('Pas de séquence active') }

      const { error: replaceError } = await supabase.rpc(
        'replace_sequence_steps',
        {
          p_sequence_id: sequenceId,
          p_step_card_ids: nextStepCardIds,
        }
      )

      if (!replaceError) refresh()
      return { error: replaceError as Error | null }
    },
    [sequenceId, refresh]
  )

  /** Ajoute une étape en dernière position */
  const addStep = useCallback(
    async (stepCardId: string): Promise<ActionResult> => {
      if (!sequenceId) return { error: new Error('Pas de séquence active') }

      return replaceSteps([...steps.map(step => step.step_card_id), stepCardId])
    },
    [sequenceId, steps, replaceSteps]
  )

  const removeStep = useCallback(
    async (stepId: string): Promise<ActionResult> => {
      if (!sequenceId) return { error: new Error('Pas de séquence active') }

      const nextStepCardIds = steps
        .filter(step => step.id !== stepId)
        .map(step => step.step_card_id)

      if (nextStepCardIds.length < 2) {
        return { error: new Error('La séquence doit avoir au moins 2 étapes.') }
      }

      return replaceSteps(nextStepCardIds)
    },
    [sequenceId, steps, replaceSteps]
  )

  const moveStep = useCallback(
    async (stepId: string, newPosition: number): Promise<ActionResult> => {
      if (!sequenceId) return { error: new Error('Pas de séquence active') }

      const currentIndex = steps.findIndex(step => step.id === stepId)
      if (currentIndex === -1) return { error: new Error('Étape introuvable') }
      if (newPosition < 0 || newPosition >= steps.length) {
        return { error: new Error('Position cible invalide.') }
      }

      const reorderedSteps = [...steps]
      const [movedStep] = reorderedSteps.splice(currentIndex, 1)
      reorderedSteps.splice(newPosition, 0, movedStep)

      return replaceSteps(reorderedSteps.map(step => step.step_card_id))
    },
    [sequenceId, steps, replaceSteps]
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
