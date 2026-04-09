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

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import type { Database } from '@/types/supabase'
import type { SessionState } from '@/hooks/useSessions'
import * as visitorSlotsDB from '@/utils/visitor/slotsDB'

export type Slot = Database['public']['Tables']['slots']['Row']
export type SlotKind = Database['public']['Enums']['slot_kind']

/** Traduit une erreur trigger DB "session verrouillée" en message utilisateur neutre. */
function toSessionLockError(err: unknown): Error | null {
  if (!err) return null
  const msg = (err as { message?: string }).message ?? ''
  if (
    msg.includes('pendant une session démarrée') ||
    msg.includes('session is in progress')
  ) {
    return new Error('Annulez la session en cours pour modifier les étapes.')
  }
  return err as Error
}

// Type unifié : Slot DB ou Slot visitor (structures identiques)
type _UnifiedSlot = Slot | visitorSlotsDB.VisitorSlot

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
  /** Ajouter un slot "étape" (position = max actuel + 1, tokens = 0 par défaut) */
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
export default function useSlots(
  timelineId: string | null,
  sessionState?: SessionState | null
): UseSlotReturn {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const previousTimelineIdRef = useRef<string | null>(null)
  const hasResolvedCurrentTimelineRef = useRef(false)

  useEffect(() => {
    // Pas de timeline → pas d'appel DB, état vide immédiat
    if (!timelineId) {
      previousTimelineIdRef.current = null
      hasResolvedCurrentTimelineRef.current = false
      setSlots([])
      setLoading(false)
      setError(null)
      return
    }

    // VISITOR mode → Charger depuis IndexedDB (ZÉRO appel Supabase)
    // 'visitor-timeline-local' est un ID spécial qui ne doit jamais toucher la DB
    if (timelineId === 'visitor-timeline-local') {
      const isTimelineChange = previousTimelineIdRef.current !== timelineId
      previousTimelineIdRef.current = timelineId

      if (isTimelineChange) {
        hasResolvedCurrentTimelineRef.current = false
        setSlots([])
        setLoading(true)
      } else if (!hasResolvedCurrentTimelineRef.current) {
        setLoading(true)
      }
      setError(null)

      const loadVisitorSlots = async () => {
        try {
          // Initialiser 3 slots par défaut si vide
          await visitorSlotsDB.initializeDefaultSlots()

          // Charger tous les slots depuis IndexedDB
          const visitorSlots = await visitorSlotsDB.getAllSlots()

          // Convertir en format Slot (structure identique)
          const formattedSlots: Slot[] = visitorSlots.map(s => ({
            id: s.id,
            timeline_id: s.timeline_id,
            kind: s.kind,
            position: s.position,
            card_id: s.card_id,
            tokens: s.tokens,
            created_at: new Date(s.created_at).toISOString(),
            updated_at: new Date(s.updated_at).toISOString(),
          }))

          setSlots(formattedSlots)
          hasResolvedCurrentTimelineRef.current = true
        } catch (err) {
          console.error('[useSlots] Erreur chargement slots visitor:', err)
          setError(err as Error)
        } finally {
          setLoading(false)
        }
      }

      void loadVisitorSlots()
      return
    }

    const isTimelineChange = previousTimelineIdRef.current !== timelineId
    previousTimelineIdRef.current = timelineId

    const controller = new AbortController()
    if (isTimelineChange) {
      hasResolvedCurrentTimelineRef.current = false
      setSlots([])
      setLoading(true)
    } else if (!hasResolvedCurrentTimelineRef.current) {
      setLoading(true)
    }
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
        hasResolvedCurrentTimelineRef.current = true
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
      // Guard : composition verrouillée pendant session démarrée
      // IndexedDB (Visitor) n'a pas de triggers — ce hook est la seule ligne de défense
      if (sessionState === 'active_started') {
        return {
          error: new Error(
            'Annulez la session en cours pour modifier les étapes.'
          ),
        }
      }

      if (!timelineId) return { error: new Error('Pas de timeline active') }

      // VISITOR mode → Utiliser IndexedDB (pas de Supabase)
      if (timelineId === 'visitor-timeline-local') {
        try {
          await visitorSlotsDB.createSlot(kind)
          refresh()
          return { error: null }
        } catch (err) {
          return { error: err as Error }
        }
      }

      // AUTH mode → Utiliser Supabase
      // Position = max(position) + 1.
      // Plus robuste que slots.length si l'historique contient des positions non contiguës.
      // La DB reste autorité finale via UNIQUE(timeline_id, position).
      const maxPosition = slots.reduce(
        (max, slot) => (slot.position > max ? slot.position : max),
        -1
      )
      const nextPosition = maxPosition + 1

      const { error: insertError } = await supabase.from('slots').insert({
        timeline_id: timelineId,
        kind,
        position: nextPosition,
        card_id: null,
        // Valeur par défaut tokens : 0 jeton pour une étape, null pour une récompense
        tokens: kind === 'step' ? 0 : null,
      })

      if (!insertError) refresh()
      return { error: toSessionLockError(insertError) }
    },
    [timelineId, slots, refresh, sessionState]
  )

  const addStep = useCallback(() => addSlot('step'), [addSlot])
  const addReward = useCallback(() => addSlot('reward'), [addSlot])

  const updateSlot = useCallback(
    async (
      id: string,
      updates: { card_id?: string | null; tokens?: number | null }
    ): Promise<ActionResult> => {
      if (!timelineId) return { error: new Error('Pas de timeline active') }

      // Guard : désassignation de carte verrouillée pendant session démarrée
      // Retirer une carte (card_id → NULL) d'une étape pendant active_started
      // laisse l'enfant face à un slot vide en pleine session — expérience TSA désastreuse.
      // IndexedDB (Visitor) n'a pas de triggers DB — ce hook est la seule défense en Visitor.
      if (sessionState === 'active_started' && updates.card_id === null) {
        const affectedSlot = slots.find(s => s.id === id)
        if (affectedSlot?.kind === 'step') {
          return {
            error: new Error(
              "Annulez la session en cours pour retirer une carte d'une étape."
            ),
          }
        }
      }

      // VISITOR mode → Utiliser IndexedDB (pas de Supabase)
      if (timelineId === 'visitor-timeline-local') {
        try {
          const currentSlot = slots.find(slot => slot.id === id)
          const normalizedUpdates =
            currentSlot?.kind === 'step' &&
            updates.card_id === null &&
            updates.tokens === undefined
              ? { ...updates, tokens: 0 }
              : updates

          await visitorSlotsDB.updateSlot(id, normalizedUpdates)
          refresh()
          return { error: null }
        } catch (err) {
          return { error: err as Error }
        }
      }

      // AUTH mode → Utiliser Supabase
      const currentSlot = slots.find(slot => slot.id === id)
      const normalizedUpdates =
        currentSlot?.kind === 'step' &&
        updates.card_id === null &&
        updates.tokens === undefined
          ? { ...updates, tokens: 0 }
          : updates

      const { error: updateError } = await supabase
        .from('slots')
        .update({
          ...normalizedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('timeline_id', timelineId)

      if (!updateError) refresh()
      return { error: updateError as Error | null }
    },
    [timelineId, slots, refresh, sessionState]
  )

  const removeSlot = useCallback(
    async (id: string): Promise<ActionResult> => {
      // Guard : composition verrouillée pendant session démarrée
      // IndexedDB (Visitor) n'a pas de triggers — ce hook est la seule ligne de défense
      if (sessionState === 'active_started') {
        return {
          error: new Error(
            'Annulez la session en cours pour modifier les étapes.'
          ),
        }
      }

      if (!timelineId) return { error: new Error('Pas de timeline active') }

      // VISITOR mode → Utiliser IndexedDB (pas de Supabase)
      if (timelineId === 'visitor-timeline-local') {
        try {
          await visitorSlotsDB.deleteSlot(id)
          refresh()
          return { error: null }
        } catch (err) {
          return { error: err as Error }
        }
      }

      // AUTH mode → Utiliser Supabase
      const { error: deleteError } = await supabase
        .from('slots')
        .delete()
        .eq('id', id)
        .eq('timeline_id', timelineId)

      if (!deleteError) refresh()
      return { error: toSessionLockError(deleteError) }
    },
    [timelineId, refresh, sessionState]
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

    // VISITOR mode → Utiliser IndexedDB (pas de Supabase)
    if (timelineId === 'visitor-timeline-local') {
      try {
        await visitorSlotsDB.clearAllCards()
        refresh()
        return { error: null }
      } catch (err) {
        return { error: err as Error }
      }
    }

    // AUTH mode → Utiliser Supabase
    const { error: clearCardsError } = await supabase
      .from('slots')
      .update({ card_id: null, updated_at: new Date().toISOString() })
      .eq('timeline_id', timelineId)

    if (clearCardsError) {
      return { error: clearCardsError as Error | null }
    }

    const { error: resetStepTokensError } = await supabase
      .from('slots')
      .update({ tokens: 0, updated_at: new Date().toISOString() })
      .eq('timeline_id', timelineId)
      .eq('kind', 'step')

    if (!resetStepTokensError) refresh()
    return { error: resetStepTokensError as Error | null }
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
