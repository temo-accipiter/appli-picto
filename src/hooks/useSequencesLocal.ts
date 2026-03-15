/**
 * useSequencesLocal.ts — Hook CRUD séquences Visitor local-only (IndexedDB).
 *
 * ⚠️ SCOPE STRICT : Visitor uniquement
 * - Utilisateurs authentifiés utilisent `useSequences.ts` (Supabase cloud)
 * - Ce hook ne doit JAMAIS être appelé pour des utilisateurs connectés
 *
 * ⚠️ API UNIFIÉE
 * - Signature identique à `useSequences.ts` pour faciliter le routing
 * - Permet au parent (SlotsEditor) de router sans changement de logique UI
 *
 * ⚠️ RÈGLES LOCALES VISITOR
 * - Min 2 étapes par séquence (enforcement dans sequencesDB.ts)
 * - Pas de doublons step_card_id (enforcement dans sequencesDB.ts)
 * - Une séquence par mother_card_id (enforcement dans sequencesDB.ts)
 *
 * ⚠️ SYSTÈME SÉQUENÇAGE — NE PAS FUSIONNER AVEC
 * - Système planning (timelines, slots)
 * - Système jetons (tokens)
 */

import { useState, useEffect, useCallback } from 'react'
import * as sequencesDB from '@/utils/visitor/sequencesDB'

export type VisitorSequence = sequencesDB.VisitorSequence

interface ActionResult {
  error: Error | null
}

interface UseSequencesLocalReturn {
  /** Séquences Visitor locales */
  sequences: VisitorSequence[]
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture (IndexedDB) */
  error: Error | null
  /**
   * Créer une séquence pour une carte mère avec ses étapes initiales.
   * ⚠️ IndexedDB bloque si une séquence existe déjà pour cette carte (UNIQUE).
   * ⚠️ La séquence doit recevoir ≥2 étapes (contrainte locale).
   */
  createSequence: (
    motherCardId: string,
    stepCardIds: string[]
  ) => Promise<ActionResult & { id: string | null }>
  /**
   * Supprimer une séquence (CASCADE supprime aussi les étapes).
   */
  deleteSequence: (sequenceId: string) => Promise<ActionResult>
  /** Rafraîchir depuis IndexedDB */
  refresh: () => void
}

/**
 * CRUD séquences Visitor local-only (IndexedDB).
 *
 * Charge toutes les séquences Visitor depuis IndexedDB.
 * API unifiée avec `useSequences.ts` (cloud) pour faciliter le routing.
 *
 * @param enabled - Si false, skip toute exécution (pattern adapter routing)
 *
 * @example
 * ```tsx
 * const { sequences, createSequence, deleteSequence } = useSequencesLocal()
 * // Trouver la séquence d'une carte
 * const seq = sequences.find(s => s.mother_card_id === cardId)
 * ```
 */
export default function useSequencesLocal(
  enabled: boolean = true
): UseSequencesLocalReturn {
  const [sequences, setSequences] = useState<VisitorSequence[]>([])
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

    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchSequences = async () => {
      try {
        const data = await sequencesDB.getAllSequences()

        if (cancelled) return

        setSequences(data)
      } catch (err) {
        if (cancelled) return
        console.error('[useSequencesLocal] Erreur lecture séquences:', err)
        setError(err as Error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchSequences()

    return () => {
      cancelled = true
    }
  }, [refreshKey, enabled])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /** Crée une nouvelle séquence Visitor avec ses étapes initiales. */
  const createSequence = useCallback(
    async (
      motherCardId: string,
      stepCardIds: string[]
    ): Promise<ActionResult & { id: string | null }> => {
      try {
        const newSequence = await sequencesDB.createSequenceWithSteps(
          motherCardId,
          stepCardIds
        )

        // Rafraîchir la liste
        refresh()

        return { id: newSequence.id, error: null }
      } catch (err) {
        console.error('[useSequencesLocal] Erreur création séquence:', err)
        return { id: null, error: err as Error }
      }
    },
    [refresh]
  )

  /**
   * Supprime une séquence (CASCADE supprime aussi les étapes).
   */
  const deleteSequence = useCallback(
    async (sequenceId: string): Promise<ActionResult> => {
      try {
        await sequencesDB.deleteSequence(sequenceId)

        // Rafraîchir la liste
        refresh()

        return { error: null }
      } catch (err) {
        console.error('[useSequencesLocal] Erreur suppression séquence:', err)
        return { error: err as Error }
      }
    },
    [refresh]
  )

  return {
    sequences,
    loading,
    error,
    createSequence,
    deleteSequence,
    refresh,
  }
}
