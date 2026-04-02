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
  category_id?: string | null // ✅ Catégorie associée via user_card_categories (hydraté client-side)
}

// Résultat des actions (erreur DB retournée telle quelle)
interface ActionResult {
  error: Error | null
}

interface CreatePersonalCardInput {
  id: string // ✅ UUID v4 généré client-side (même ID que Storage)
  name: string
  image_url: string // ✅ Path strict: {accountId}/cards/{cardId}.jpg
}

interface UsePersonalCardsReturn {
  cards: PersonalCard[]
  loading: boolean
  error: Error | null
  createCard: (input: CreatePersonalCardInput) => Promise<ActionResult>
  updateCard: (id: string, updates: { name: string }) => Promise<ActionResult>
  updateCardCategory: (
    cardId: string,
    categoryId: string
  ) => Promise<ActionResult>
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
        // ✅ Query 1 : Cartes personnelles
        const { data: cardsData, error: fetchError } = await supabase
          .from('cards')
          .select('*')
          .eq('type', 'personal')
          .eq('account_id', user.id)
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        const rawCards = (cardsData as Card[]) || []

        // ✅ Query 2 : Mappings user_card_categories (catégories associées)
        const { data: mappingsData, error: mappingsError } = await supabase
          .from('user_card_categories')
          .select('card_id, category_id')
          .eq('user_id', user.id)
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (mappingsError) {
          console.warn(
            '[usePersonalCards] Erreur mappings (non bloquant):',
            mappingsError
          )
        }

        // ✅ Hydratation : Associer category_id à chaque carte via mapping
        const mappingsMap = new Map<string, string>()
        if (mappingsData) {
          mappingsData.forEach(m => {
            mappingsMap.set(m.card_id, m.category_id)
          })
        }

        const hydratedCards: PersonalCard[] = rawCards.map(card => ({
          ...card,
          type: 'personal' as const,
          account_id: user.id,
          published: null,
          category_id: mappingsMap.get(card.id) ?? null, // null si pas de mapping (fallback "Sans catégorie" côté UI)
        }))

        setCards(hydratedCards)
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
        id: input.id, // ✅ UUID v4 généré client-side (même ID que Storage)
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
   * Associer une catégorie à une carte (UPSERT dans user_card_categories)
   * - Utilise onConflict avec contrainte UNIQUE (user_id, card_id)
   * - Crée ou met à jour le mapping utilisateur ↔ carte ↔ catégorie
   */
  const updateCardCategory = useCallback(
    async (cardId: string, categoryId: string): Promise<ActionResult> => {
      if (!user) return { error: new Error('Non connecté') }

      const { error: upsertError } = await supabase
        .from('user_card_categories')
        .upsert(
          {
            user_id: user.id,
            card_id: cardId,
            category_id: categoryId,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,card_id', // ✅ Contrainte UNIQUE (user_id, card_id)
          }
        )

      if (!upsertError) refresh()

      return { error: upsertError as Error | null }
    },
    [user, refresh]
  )

  /**
   * Supprimer une carte personnelle
   *
   * DB-first strict :
   * - Trigger `guard_card_delete_active_sessions` gère les guardrails :
   *   → RAISE EXCEPTION si carte validée en session active
   *   → epoch++ automatique si session active non validée
   * - ON DELETE CASCADE/SET NULL gèrent les dépendances :
   *   → `slots.card_id` SET NULL (slot devient vide)
   *   → `sequence_steps.step_card_id` CASCADE (step supprimé)
   *   → `sequences.mother_card_id` CASCADE (séquence supprimée)
   * - Le frontend tente DELETE, gère erreur DB proprement
   */
  const deleteCard = useCallback(
    async (id: string): Promise<ActionResult> => {
      if (!user) return { error: new Error('Non connecté') }

      try {
        // ✅ DB-first : Suppression carte directe (trigger + FK gèrent tout)
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .eq('id', id)
          .eq('type', 'personal')
          .eq('account_id', user.id)

        if (deleteError) {
          console.warn(
            '[usePersonalCards] Suppression refusée par la base de données:',
            deleteError.message
          )
          // Créer Error lisible pour UI (éviter cast `as Error` avec objet Postgrest {})
          return {
            error: new Error(
              deleteError.message || 'Erreur lors de la suppression'
            ),
          }
        }

        // ✅ Succès : Rafraîchir cache cartes
        refresh()
        return { error: null }
      } catch (err) {
        console.error(
          '[usePersonalCards] Erreur inattendue suppression carte:',
          err
        )
        return { error: err as Error }
      }
    },
    [user, refresh]
  )

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    updateCardCategory,
    deleteCard,
    refresh,
  }
}
