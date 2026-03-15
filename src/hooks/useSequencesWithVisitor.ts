/**
 * useSequencesWithVisitor.ts — Hook adapter : route vers local (Visitor) ou cloud (auth).
 *
 * ⚠️ RÈGLE CRITIQUE : ZÉRO DOUBLE EXÉCUTION
 * - Une seule branche active : soit local, soit cloud
 * - Basé sur `isVisitor` (détection `!user && authReady`)
 * - Pas de side effect cloud quand `isVisitor === true`
 * - Pas de side effect local quand `isVisitor === false`
 *
 * ⚠️ ARCHITECTURE
 * - Utilisé au niveau parent (SlotsEditor, Tableau)
 * - Les composants enfants (SequenceEditor, SlotItem) ne connaissent pas la source
 * - API unifiée : les hooks locaux et cloud ont la même signature
 *
 * ⚠️ SYSTÈME SÉQUENÇAGE — NE PAS FUSIONNER AVEC
 * - Système planning (timelines, slots)
 * - Système jetons (tokens)
 */

import { useIsVisitor } from '@/hooks'
import useSequences from '@/hooks/useSequences'
import useSequencesLocal from '@/hooks/useSequencesLocal'
import type { Sequence } from '@/hooks/useSequences'
import type { VisitorSequence } from '@/hooks/useSequencesLocal'

/**
 * Type unifié pour séquence (cloud ou local).
 * Les deux types ont des structures compatibles pour l'UI.
 */
export type UnifiedSequence = Sequence | VisitorSequence

interface ActionResult {
  error: Error | null
}

interface UseSequencesWithVisitorReturn {
  /** Séquences (cloud ou local selon isVisitor) */
  sequences: UnifiedSequence[]
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture */
  error: Error | null
  /** Créer une séquence pour une carte mère */
  createSequence: (
    motherCardId: string,
    stepCardIds: string[]
  ) => Promise<ActionResult & { id: string | null }>
  /** Supprimer une séquence */
  deleteSequence: (sequenceId: string) => Promise<ActionResult>
  /** Rafraîchir depuis la source (cloud ou local) */
  refresh: () => void
  /** Flag indiquant que la source est Visitor local-only */
  isVisitorSource: boolean
}

/**
 * Hook adapter : route vers local (Visitor) ou cloud (auth).
 *
 * ZÉRO DOUBLE EXÉCUTION : une seule branche active selon `isVisitor`.
 *
 * @example
 * ```tsx
 * const { sequences, createSequence, isVisitorSource } = useSequencesWithVisitor()
 *
 * // Utiliser sequences normalement, la source est abstraite
 * const seq = sequences.find(s => s.mother_card_id === cardId)
 * ```
 */
export default function useSequencesWithVisitor(): UseSequencesWithVisitorReturn {
  const { isVisitor, authReady } = useIsVisitor()

  // ⚠️ ROUTING STRICT : une seule branche active
  // Si isVisitor → hook cloud désactivé (enabled = false)
  // Si !isVisitor → hook local désactivé (enabled = false)
  // Un seul hook actif à la fois = ZÉRO double exécution

  const cloudResult = useSequences(!isVisitor && authReady)
  const localResult = useSequencesLocal(isVisitor && authReady)

  // Attendre que authReady soit true pour éviter flickering
  if (!authReady) {
    return {
      sequences: [],
      loading: true,
      error: null,
      createSequence: async () => ({ id: null, error: null }),
      deleteSequence: async () => ({ error: null }),
      refresh: () => {},
      isVisitorSource: false,
    }
  }

  // Router vers la bonne source
  if (isVisitor) {
    return {
      ...localResult,
      sequences: localResult.sequences as UnifiedSequence[],
      isVisitorSource: true,
    }
  }

  return {
    ...cloudResult,
    sequences: cloudResult.sequences as UnifiedSequence[],
    isVisitorSource: false,
  }
}
