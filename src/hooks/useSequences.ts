// src/hooks/useSequences.ts
// CRUD séquences pour un compte (0..1 séquence par carte mère)
//
// ⚠️ DB-FIRST STRICT
// Invariants garantis côté DB (le front ne les vérifie PAS) :
//   - UNIQUE(account_id, mother_card_id) → 0..1 séquence par carte par compte
//   - Minimum 2 étapes → trigger sequences_enforce_min_two_steps (DEFERRABLE)
//   - Ownership cartes perso → trigger vérifie même account_id
//
// ⚠️ FEATURE GATING
//   - Subscriber/Admin uniquement → RLS owner-only (SELECT, INSERT, UPDATE, DELETE)
//   - Free/Visitor → RLS bloque silencieusement → le front affiche "fonctionnalité réservée"
//   - Visitor local-only (IndexedDB) → DIFFÉRÉ après S7 (hors périmètre)
//
// ⚠️ SYSTÈME SÉQUENÇAGE — NE PAS FUSIONNER AVEC
//   - Système planning (timelines, slots) → structures distinctes
//   - Système jetons (tokens) → métriques distinctes

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import type { Database } from '@/types/supabase'

export type Sequence = Database['public']['Tables']['sequences']['Row']

interface ActionResult {
  error: Error | null
}

interface UseSequencesReturn {
  /** Séquences du compte courant */
  sequences: Sequence[]
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture (DB ou réseau) */
  error: Error | null
  /**
   * Créer atomiquement une séquence pour une carte mère avec ses étapes initiales.
   * ⚠️ La DB reste la source de vérité pour le min 2 étapes, les doublons et l'ownership.
   */
  createSequence: (
    motherCardId: string,
    stepCardIds: string[]
  ) => Promise<ActionResult & { id: string | null }>
  /**
   * Supprimer une séquence (CASCADE supprime aussi les sequence_steps).
   * ⚠️ Réservé Subscriber/Admin — RLS bloque sinon.
   */
  deleteSequence: (sequenceId: string) => Promise<ActionResult>
  /** Rafraîchir depuis la DB */
  refresh: () => void
}

/**
 * CRUD séquences pour le compte connecté.
 *
 * Charge toutes les séquences du compte, avec leur mother_card_id.
 * Chaque séquence est associée à exactement une carte mère (0..1 par carte).
 *
 * @param enabled - Si false, skip toute exécution (pattern adapter routing)
 *
 * @example
 * ```tsx
 * const { sequences, createSequence, deleteSequence } = useSequences()
 * // Trouver la séquence d'une carte
 * const seq = sequences.find(s => s.mother_card_id === cardId)
 * ```
 */
export default function useSequences(
  enabled: boolean = true
): UseSequencesReturn {
  const [sequences, setSequences] = useState<Sequence[]>([])
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

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchSequences = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('sequences')
          .select('*')
          .order('created_at', { ascending: true })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        setSequences(data ?? [])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useSequences] Erreur lecture séquences:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchSequences()

    return () => {
      controller.abort()
    }
  }, [refreshKey, enabled])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /** Crée une nouvelle séquence via RPC atomique. */
  const createSequence = useCallback(
    async (
      motherCardId: string,
      stepCardIds: string[]
    ): Promise<ActionResult & { id: string | null }> => {
      const { data, error: createError } = await supabase.rpc(
        'create_sequence_with_steps',
        {
          p_mother_card_id: motherCardId,
          p_step_card_ids: stepCardIds,
        }
      )

      if (!createError) refresh()
      return {
        id: data ?? null,
        error: createError as Error | null,
      }
    },
    [refresh]
  )

  const deleteSequence = useCallback(
    async (sequenceId: string): Promise<ActionResult> => {
      const { error: deleteError } = await supabase
        .from('sequences')
        .delete()
        .eq('id', sequenceId)

      if (!deleteError) refresh()
      return { error: deleteError as Error | null }
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
