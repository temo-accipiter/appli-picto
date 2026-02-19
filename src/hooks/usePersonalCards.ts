// src/hooks/usePersonalCards.ts
// CRUD cartes personnelles (Subscriber/Admin uniquement via RLS)
// DB-first strict : le front tente → gère le refus DB proprement
// Contrat §3.2.3 + §5.2.3 + §5.3

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import useAuth from './useAuth'
import type { Database } from '@/types/supabase'

type Card = Database['public']['Tables']['cards']['Row']
type CardInsert = Database['public']['Tables']['cards']['Insert']
type CardUpdate = Database['public']['Tables']['cards']['Update']

export type PersonalCard = Card & {
  type: 'personal'
  account_id: string
  published: null
}

// Résultat des actions (erreur DB retournée telle quelle)
interface ActionResult {
  error: Error | null
}

interface CreatePersonalCardInput {
  name: string
  image_url: string
}

interface UsePersonalCardsReturn {
  cards: PersonalCard[]
  loading: boolean
  error: Error | null
  createCard: (input: CreatePersonalCardInput) => Promise<ActionResult>
  updateCard: (id: string, updates: { name: string }) => Promise<ActionResult>
  deleteCard: (id: string) => Promise<ActionResult>
  refresh: () => void
}

/**
 * CRUD cartes personnelles (Subscriber/Admin uniquement via RLS)
 *
 * DB-first strict :
 * - Le front tente l'action → gère le refus DB proprement
 * - Pas de comptage quota côté front (trigger DB check_can_create_personal_card)
 * - Image immutable après création (image_url non modifiable via RLS + trigger)
 * - Pour changer l'image : supprimer + recréer
 *
 * Storage :
 * - Upload vers personal-images/{account_id}/{card_id}.ext (owner-only)
 * - Affichage via signed URL (bucket privé)
 */
export default function usePersonalCards(): UsePersonalCardsReturn {
  const [cards, setCards] = useState<PersonalCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user, authReady } = useAuth()

  useEffect(() => {
    // Visitor (pas d'user) : pas de cartes perso
    if (!authReady) return
    if (!user) {
      setCards([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchPersonalCards = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('cards')
          .select('*')
          .eq('type', 'personal')
          .eq('account_id', user.id)
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        setCards((data as PersonalCard[]) || [])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[usePersonalCards] Erreur lecture cartes perso:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchPersonalCards()

    return () => {
      controller.abort()
    }
  }, [user, authReady, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /**
   * Créer une carte personnelle
   * - DB refuse si quota dépassé (trigger check_can_create_personal_card)
   * - DB refuse si Visitor/Free (RLS)
   * - DB refuse si execution-only (RLS BLOCKER 4)
   */
  const createCard = useCallback(
    async (input: CreatePersonalCardInput): Promise<ActionResult> => {
      if (!user) return { error: new Error('Non connecté') }

      const cardInsert: CardInsert = {
        type: 'personal',
        account_id: user.id,
        name: input.name,
        image_url: input.image_url,
        published: null, // toujours null pour personal (contrainte DB)
      }

      const { error: insertError } = await supabase
        .from('cards')
        .insert([cardInsert])

      if (!insertError) refresh()

      return { error: insertError as Error | null }
    },
    [user, refresh]
  )

  /**
   * Modifier une carte personnelle (nom uniquement)
   * ⚠️ image_url est IMMUTABLE après création (trigger DB + RLS)
   * Pour changer l'image : deleteCard + createCard
   */
  const updateCard = useCallback(
    async (id: string, updates: { name: string }): Promise<ActionResult> => {
      if (!user) return { error: new Error('Non connecté') }

      const cardUpdate: CardUpdate = {
        name: updates.name,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('cards')
        .update(cardUpdate)
        .eq('id', id)
        .eq('type', 'personal')
        .eq('account_id', user.id)

      if (!updateError) refresh()

      return { error: updateError as Error | null }
    },
    [user, refresh]
  )

  /**
   * Supprimer une carte personnelle
   * - DB gère les cascades (slots, sequences, pivot)
   * - Si carte utilisée en session active → Réinitialisation session (epoch++)
   */
  const deleteCard = useCallback(
    async (id: string): Promise<ActionResult> => {
      if (!user) return { error: new Error('Non connecté') }

      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .eq('id', id)
        .eq('type', 'personal')
        .eq('account_id', user.id)

      if (!deleteError) refresh()

      return { error: deleteError as Error | null }
    },
    [user, refresh]
  )

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    deleteCard,
    refresh,
  }
}
