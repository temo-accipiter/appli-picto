/**
 * useSequenceStepsLocal.ts — Hook CRUD étapes séquence Visitor local-only (IndexedDB).
 *
 * ⚠️ SCOPE STRICT : Visitor uniquement
 * - Utilisateurs authentifiés utilisent `useSequenceSteps.ts` (Supabase cloud)
 * - Ce hook ne doit JAMAIS être appelé pour des utilisateurs connectés
 *
 * ⚠️ API UNIFIÉE
 * - Signature identique à `useSequenceSteps.ts` pour faciliter le routing
 * - Permet au composant SequenceEditor de fonctionner sans changement
 *
 * ⚠️ RÈGLES LOCALES VISITOR
 * - Minimum 2 étapes (enforcement dans sequencesDB.ts)
 * - UNIQUE(sequence_id, step_card_id) → pas de doublon de carte
 * - UNIQUE(sequence_id, position) → positions uniques
 *
 * ⚠️ SYSTÈME SÉQUENÇAGE — NE PAS FUSIONNER AVEC
 * - Système planning (timelines, slots)
 * - Système jetons (tokens)
 */

import { useState, useEffect, useCallback } from 'react'
import * as sequencesDB from '@/utils/visitor/sequencesDB'

export type VisitorSequenceStep = sequencesDB.VisitorSequenceStep

interface ActionResult {
  error: Error | null
}

interface UseSequenceStepsLocalReturn {
  /** Étapes de la séquence, triées par position ASC */
  steps: VisitorSequenceStep[]
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture */
  error: Error | null
  /**
   * Ajouter une étape à la séquence.
   * Position = max actuel + 1.
   * ⚠️ IndexedDB bloque si la carte est déjà dans la séquence (UNIQUE step_card_id).
   */
  addStep: (stepCardId: string) => Promise<ActionResult>
  /**
   * Supprimer une étape.
   * ⚠️ IndexedDB bloque si c'est la 2ème étape et qu'il en resterait <2.
   */
  removeStep: (stepId: string) => Promise<ActionResult>
  /**
   * Déplacer une étape à une nouvelle position.
   * Stratégie : échange des positions (A↔B).
   */
  moveStep: (stepId: string, newPosition: number) => Promise<ActionResult>
  /** Rafraîchir depuis IndexedDB */
  refresh: () => void
}

/**
 * CRUD étapes pour une séquence Visitor local-only.
 *
 * @param sequenceId - ID de la séquence (null = pas d'appel DB)
 * @param enabled - Si false, skip toute exécution (pattern adapter routing)
 *
 * @example
 * ```tsx
 * const { steps, addStep, removeStep } = useSequenceStepsLocal(sequence?.id ?? null)
 * ```
 */
export default function useSequenceStepsLocal(
  sequenceId: string | null,
  enabled: boolean = true
): UseSequenceStepsLocalReturn {
  const [steps, setSteps] = useState<VisitorSequenceStep[]>([])
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

    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchSteps = async () => {
      try {
        const data = await sequencesDB.getSequenceSteps(sequenceId)

        if (cancelled) return

        setSteps(data)
      } catch (err) {
        if (cancelled) return
        console.error('[useSequenceStepsLocal] Erreur lecture étapes:', err)
        setError(err as Error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchSteps()

    return () => {
      cancelled = true
    }
  }, [sequenceId, refreshKey, enabled])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /**
   * Ajoute une étape à la séquence.
   */
  const addStep = useCallback(
    async (stepCardId: string): Promise<ActionResult> => {
      if (!sequenceId) {
        return { error: new Error('Aucune séquence active') }
      }

      try {
        await sequencesDB.addSequenceStep(sequenceId, stepCardId)

        // Rafraîchir la liste
        refresh()

        return { error: null }
      } catch (err) {
        console.error('[useSequenceStepsLocal] Erreur ajout étape:', err)
        return { error: err as Error }
      }
    },
    [sequenceId, refresh]
  )

  /**
   * Supprime une étape.
   */
  const removeStep = useCallback(
    async (stepId: string): Promise<ActionResult> => {
      try {
        await sequencesDB.removeSequenceStep(stepId)

        // Rafraîchir la liste
        refresh()

        return { error: null }
      } catch (err) {
        console.error('[useSequenceStepsLocal] Erreur suppression étape:', err)
        return { error: err as Error }
      }
    },
    [refresh]
  )

  /**
   * Déplace une étape à une nouvelle position.
   */
  const moveStep = useCallback(
    async (stepId: string, newPosition: number): Promise<ActionResult> => {
      try {
        await sequencesDB.moveSequenceStep(stepId, newPosition)

        // Rafraîchir la liste
        refresh()

        return { error: null }
      } catch (err) {
        console.error('[useSequenceStepsLocal] Erreur déplacement étape:', err)
        return { error: err as Error }
      }
    },
    [refresh]
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
