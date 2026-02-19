// src/hooks/useSlots.ts
// CRUD slots pour une timeline (relation 1:N)
//
// ⚠️ DB-FIRST STRICT
// Invariants garantis côté DB (le front ne les vérifie PAS) :
//   - Minimum 1 slot de kind "step"   → trigger slots_enforce_min_step
//   - Minimum 1 slot de kind "reward" → trigger slots_enforce_min_reward
//   - tokens CHECK 0 ≤ tokens ≤ 5    → CHECK constraint
//   - UNIQUE(timeline_id, position)   → DB gère la numérotation
//   - CASCADE DELETE timelines→slots  → cohérence automatique

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import type { Database } from '@/types/supabase'

export type Slot = Database['public']['Tables']['slots']['Row']
export type SlotKind = Database['public']['Enums']['slot_kind']

interface ActionResult {
  error: Error | null
}

interface UseSlotReturn {
  /** Slots de la timeline, triés par position ASC */
  slots: Slot[]
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture */
  error: Error | null
  /** Ajouter un slot "étape" (position = max actuel + 1, tokens = 1 par défaut) */
  addStep: () => Promise<ActionResult>
  /** Ajouter un slot "récompense" (position = max actuel + 1, tokens = null) */
  addReward: () => Promise<ActionResult>
  /**
   * Modifier un slot (carte assignée et/ou tokens)
   * La DB bloque si tokens < 0 ou > 5, ou si card_id n'existe pas.
   */
  updateSlot: (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => Promise<ActionResult>
  /**
   * Supprimer un slot.
   * La DB bloque si c'est le dernier slot "step" ou le dernier slot "reward".
   */
  removeSlot: (id: string) => Promise<ActionResult>
  /**
   * Retirer toutes les cartes assignées (card_id → NULL sur tous les slots).
   * ⚠️ Ne supprime PAS les slots — les triggers DB interdisent la suppression
   * du dernier step et du dernier reward. Seule l'affectation carte est effacée.
   */
  clearAllCards: () => Promise<ActionResult>
  /** Rafraîchir la liste depuis la DB */
  refresh: () => void
}

/**
 * CRUD slots pour une timeline.
 *
 * @param timelineId - ID de la timeline active (null = pas d'appel DB)
 *
 * @example
 * ```tsx
 * const { slots, loading, error, addStep, addReward, removeSlot } = useSlots(timeline?.id ?? null)
 * ```
 */
export default function useSlots(timelineId: string | null): UseSlotReturn {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Pas de timeline → pas d'appel DB, état vide immédiat
    if (!timelineId) {
      setSlots([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchSlots = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('slots')
          .select('*')
          .eq('timeline_id', timelineId)
          .order('position', { ascending: true })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        setSlots(data ?? [])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useSlots] Erreur lecture slots:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchSlots()

    return () => {
      controller.abort()
    }
  }, [timelineId, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /** Ajoute un slot en dernière position */
  const addSlot = useCallback(
    async (kind: SlotKind): Promise<ActionResult> => {
      if (!timelineId) return { error: new Error('Pas de timeline active') }

      // Position = nombre de slots actuels (0-indexed)
      // La DB gère UNIQUE(timeline_id, position) — en cas de conflit, elle retourne une erreur
      const nextPosition = slots.length

      const { error: insertError } = await supabase.from('slots').insert({
        timeline_id: timelineId,
        kind,
        position: nextPosition,
        card_id: null,
        // Valeur par défaut tokens : 1 jeton pour une étape, null pour une récompense
        tokens: kind === 'step' ? 1 : null,
      })

      if (!insertError) refresh()
      return { error: insertError as Error | null }
    },
    [timelineId, slots.length, refresh]
  )

  const addStep = useCallback(() => addSlot('step'), [addSlot])
  const addReward = useCallback(() => addSlot('reward'), [addSlot])

  const updateSlot = useCallback(
    async (
      id: string,
      updates: { card_id?: string | null; tokens?: number | null }
    ): Promise<ActionResult> => {
      if (!timelineId) return { error: new Error('Pas de timeline active') }

      const { error: updateError } = await supabase
        .from('slots')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('timeline_id', timelineId)

      if (!updateError) refresh()
      return { error: updateError as Error | null }
    },
    [timelineId, refresh]
  )

  const removeSlot = useCallback(
    async (id: string): Promise<ActionResult> => {
      if (!timelineId) return { error: new Error('Pas de timeline active') }

      const { error: deleteError } = await supabase
        .from('slots')
        .delete()
        .eq('id', id)
        .eq('timeline_id', timelineId)

      if (!deleteError) refresh()
      return { error: deleteError as Error | null }
    },
    [timelineId, refresh]
  )

  /**
   * Retire toutes les cartes assignées aux slots de cette timeline.
   * Opération : UPDATE slots SET card_id = NULL WHERE timeline_id = $1
   *
   * ⚠️ Cette action est permise par la RLS (slots_update_owner).
   * ⚠️ Les slots eux-mêmes sont conservés — seule l'affectation carte est effacée.
   * ⚠️ Les triggers DB ne bloquent pas cette action (ils protègent uniquement DELETE).
   */
  const clearAllCards = useCallback(async (): Promise<ActionResult> => {
    if (!timelineId) return { error: new Error('Pas de timeline active') }

    const { error: updateError } = await supabase
      .from('slots')
      .update({ card_id: null, updated_at: new Date().toISOString() })
      .eq('timeline_id', timelineId)

    if (!updateError) refresh()
    return { error: updateError as Error | null }
  }, [timelineId, refresh])

  return {
    slots,
    loading,
    error,
    addStep,
    addReward,
    updateSlot,
    removeSlot,
    clearAllCards,
    refresh,
  }
}
