// src/hooks/useAdminBankCards.ts
// CRUD cartes de banque (Admin uniquement via RLS)
// DB-first strict : le front tente → gère le refus DB proprement
// Contrat §3.3 (Administration) + §5.2.3 (Cartes banque)

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import useAuth from './useAuth'
import type { Database } from '@/types/supabase'

type Card = Database['public']['Tables']['cards']['Row']
type CardInsert = Database['public']['Tables']['cards']['Insert']
type CardUpdate = Database['public']['Tables']['cards']['Update']

// Carte de banque (admin-only)
export type AdminBankCard = Card & {
  type: 'bank'
  account_id: null
  published: boolean // ✅ NOT NULL pour bank (contrainte DB)
}

// Résultat des actions (erreur DB retournée telle quelle)
interface ActionResult {
  error: Error | null
}

interface CreateBankCardInput {
  id: string // ✅ UUID v4 généré client-side (même ID que Storage)
  name: string
  image_url: string // ✅ Path strict: {cardId}.jpg (flat dans bank-images)
  published: boolean // ✅ true = publiée, false = dépubliée
}

interface UseAdminBankCardsReturn {
  cards: AdminBankCard[]
  loading: boolean
  error: Error | null
  createCard: (input: CreateBankCardInput) => Promise<ActionResult>
  updatePublished: (id: string, published: boolean) => Promise<ActionResult>
  updateName: (id: string, name: string) => Promise<ActionResult>
  deleteCard: (id: string) => Promise<ActionResult>
  refresh: () => void
}

/**
 * CRUD cartes de banque (Admin uniquement via RLS)
 *
 * DB-first strict :
 * - Le front tente l'action → gère le refus DB proprement
 * - RLS bloque toute action si !is_admin()
 * - Trigger `cards_prevent_delete_bank_if_referenced` bloque DELETE si carte référencée
 *
 * Storage :
 * - Upload vers bank-images/{cardId}.jpg (admin-only, public read)
 * - Path flat : {uuid}.jpg (pas de sous-dossiers)
 *
 * Contraintes DB :
 * - type: 'bank' (immutable après création)
 * - account_id: NULL (contrainte CHECK)
 * - published: NOT NULL (contrainte CHECK, défaut FALSE via trigger)
 */
export default function useAdminBankCards(): UseAdminBankCardsReturn {
  const [cards, setCards] = useState<AdminBankCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user, authReady } = useAuth()

  useEffect(() => {
    // Visitor / non-auth : pas de cartes admin
    if (!authReady) return
    if (!user) {
      setCards([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchAdminBankCards = async () => {
      try {
        // ✅ Query : TOUTES les cartes bank (published true/false)
        // RLS `cards_select_admin` autorise Admin à lire toutes cartes bank
        const { data, error: fetchError } = await supabase
          .from('cards')
          .select('*')
          .eq('type', 'bank')
          .order('name', { ascending: true })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        setCards((data as AdminBankCard[]) || [])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useAdminBankCards] Erreur lecture cartes bank:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchAdminBankCards()

    return () => {
      controller.abort()
    }
  }, [user, authReady, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /**
   * Créer une carte de banque
   * - DB refuse si !is_admin() (RLS)
   * - published défaut FALSE si non fourni (trigger cards_normalize_published)
   */
  const createCard = useCallback(
    async (input: CreateBankCardInput): Promise<ActionResult> => {
      if (!user) return { error: new Error('Non connecté') }

      const cardInsert: CardInsert = {
        id: input.id, // ✅ UUID v4 généré client-side (même ID que Storage)
        type: 'bank',
        account_id: null,
        name: input.name,
        image_url: input.image_url,
        published: input.published, // ✅ true/false explicite
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
   * Modifier le statut published d'une carte bank
   * - true = publiée (visible tous)
   * - false = dépubliée (visible Admin + usages existants)
   */
  const updatePublished = useCallback(
    async (id: string, published: boolean): Promise<ActionResult> => {
      if (!user) return { error: new Error('Non connecté') }

      const cardUpdate: CardUpdate = {
        published,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('cards')
        .update(cardUpdate)
        .eq('id', id)
        .eq('type', 'bank')

      if (!updateError) refresh()

      return { error: updateError as Error | null }
    },
    [user, refresh]
  )

  /**
   * Modifier le nom d'une carte bank
   */
  const updateName = useCallback(
    async (id: string, name: string): Promise<ActionResult> => {
      if (!user) return { error: new Error('Non connecté') }

      const cardUpdate: CardUpdate = {
        name,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('cards')
        .update(cardUpdate)
        .eq('id', id)
        .eq('type', 'bank')

      if (!updateError) refresh()

      return { error: updateError as Error | null }
    },
    [user, refresh]
  )

  /**
   * Supprimer une carte de banque
   *
   * DB-first strict :
   * - Trigger `cards_prevent_delete_bank_if_referenced` bloque si carte référencée
   * - Le frontend tente DELETE, gère erreur DB proprement
   * - Erreur retournée : message contractuel utilisable côté UI
   */
  const deleteCard = useCallback(
    async (id: string): Promise<ActionResult> => {
      if (!user) return { error: new Error('Non connecté') }

      try {
        // ✅ DB-first : Suppression carte directe (trigger gère tout)
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .eq('id', id)
          .eq('type', 'bank')

        if (deleteError) {
          console.warn(
            '[useAdminBankCards] Suppression refusée par la base de données:',
            deleteError.message
          )
          // ✅ Message contractuel : "Cette carte est utilisée et ne peut pas être supprimée"
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
          '[useAdminBankCards] Erreur inattendue suppression carte:',
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
    updatePublished,
    updateName,
    deleteCard,
    refresh,
  }
}
