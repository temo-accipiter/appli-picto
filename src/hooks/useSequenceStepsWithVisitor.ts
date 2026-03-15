/**
 * useSequenceStepsWithVisitor.ts — Hook adapter : route vers local (Visitor) ou cloud (auth).
 *
 * ⚠️ RÈGLE CRITIQUE : ZÉRO DOUBLE EXÉCUTION
 * - Une seule branche active : soit local, soit cloud
 * - Basé sur `isVisitor` (détection `!user && authReady`)
 * - Pas de side effect cloud quand `isVisitor === true`
 * - Pas de side effect local quand `isVisitor === false`
 *
 * ⚠️ ARCHITECTURE
 * - Utilisé au niveau composant enfant (SequenceEditor)
 * - Le composant ne connaît pas la source (local vs cloud)
 * - API unifiée : les hooks locaux et cloud ont la même signature
 *
 * ⚠️ SYSTÈME SÉQUENÇAGE — NE PAS FUSIONNER AVEC
 * - Système planning (timelines, slots)
 * - Système jetons (tokens)
 */

import { useIsVisitor } from '@/hooks'
import useSequenceSteps from '@/hooks/useSequenceSteps'
import useSequenceStepsLocal from '@/hooks/useSequenceStepsLocal'
import type { SequenceStep } from '@/hooks/useSequenceSteps'
import type { VisitorSequenceStep } from '@/hooks/useSequenceStepsLocal'

/**
 * Type unifié pour étape (cloud ou local).
 * Les deux types ont des structures compatibles pour l'UI.
 */
export type UnifiedSequenceStep = SequenceStep | VisitorSequenceStep

interface ActionResult {
  error: Error | null
}

interface UseSequenceStepsWithVisitorReturn {
  /** Étapes de la séquence, triées par position ASC */
  steps: UnifiedSequenceStep[]
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture */
  error: Error | null
  /** Ajouter une étape */
  addStep: (stepCardId: string) => Promise<ActionResult>
  /** Supprimer une étape */
  removeStep: (stepId: string) => Promise<ActionResult>
  /** Déplacer une étape */
  moveStep: (stepId: string, newPosition: number) => Promise<ActionResult>
  /** Rafraîchir depuis la source (cloud ou local) */
  refresh: () => void
}

/**
 * Hook adapter : route vers local (Visitor) ou cloud (auth).
 *
 * ZÉRO DOUBLE EXÉCUTION : une seule branche active selon `isVisitor`.
 *
 * @param sequenceId - ID de la séquence (null = pas d'appel)
 *
 * @example
 * ```tsx
 * const { steps, addStep, removeStep } = useSequenceStepsWithVisitor(sequence?.id ?? null)
 * ```
 */
export default function useSequenceStepsWithVisitor(
  sequenceId: string | null
): UseSequenceStepsWithVisitorReturn {
  const { isVisitor, authReady } = useIsVisitor()

  // ⚠️ ROUTING STRICT : une seule branche active
  // Si isVisitor → hook cloud désactivé (enabled = false)
  // Si !isVisitor → hook local désactivé (enabled = false)
  // Un seul hook actif à la fois = ZÉRO double exécution

  const cloudResult = useSequenceSteps(sequenceId, !isVisitor && authReady)
  const localResult = useSequenceStepsLocal(sequenceId, isVisitor && authReady)

  // Attendre que authReady soit true pour éviter flickering
  if (!authReady) {
    return {
      steps: [],
      loading: true,
      error: null,
      addStep: async () => ({ error: null }),
      removeStep: async () => ({ error: null }),
      moveStep: async () => ({ error: null }),
      refresh: () => {},
    }
  }

  // Router vers la bonne source
  if (isVisitor) {
    return {
      ...localResult,
      steps: localResult.steps as UnifiedSequenceStep[],
    }
  }

  return {
    ...cloudResult,
    steps: cloudResult.steps as UnifiedSequenceStep[],
  }
}
