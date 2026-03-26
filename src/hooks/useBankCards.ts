// src/hooks/useBankCards.ts
// Lecture de la banque de cartes (published + fallback unpublished si référencées)
// Accessible à tous les statuts : Visitor (anon), Free, Subscriber, Admin
// DB-first : la RLS contrôle les accès ET le fallback unpublished, pas le front
// Contrat §5.2.3 + §3.2.3 + BLOCKER 5 TSA (pas de disparition soudaine)

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import useAuth from '@/hooks/useAuth'
import useAccountStatus from '@/hooks/useAccountStatus'
import { useRealtimeBankCards } from '@/contexts/RealtimeBankCardsContext'
import type { Database } from '@/types/supabase'

type Card = Database['public']['Tables']['cards']['Row']

// Cartes banque (published OU unpublished si référencées via RLS fallback)
export type BankCard = Card & {
  type: 'bank'
  published: boolean
  account_id: null
}

interface UseBankCardsReturn {
  cards: BankCard[]
  loading: boolean
  error: Error | null
  refresh: () => void
}

/**
 * Lecture de la banque de cartes (published + fallback unpublished si référencées)
 *
 * ✅ Accessible à tous : Visitor (anon), Free, Subscriber, Admin
 * ✅ Images dans bucket bank-images (lecture publique)
 * ✅ DB-first : RLS contrôle l'accès ET le fallback (BLOCKER 5 TSA)
 * ✅ RLS retourne published=true OU published=false si carte référencée dans slots/sequences/categories
 * ✅ Realtime : Synchro automatique sur INSERT/UPDATE/DELETE (admin → free instantané)
 *
 * ⚠️ NE PAS filtrer côté front sur published : la RLS gère le fallback
 */
export default function useBankCards(): UseBankCardsReturn {
  const [cards, setCards] = useState<BankCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // ✅ Contexte utilisateur pour filtrage Realtime RLS-aware
  const { authReady } = useAuth()
  const { isAdmin } = useAccountStatus()

  // ✅ Channel persistant pour broadcasts (partagé avec useAdminBankCards)
  const { channel: persistentChannel } = useRealtimeBankCards()

  useEffect(() => {
    // ✅ Attendre que l'auth soit prête pour avoir le bon isAdmin
    if (!authReady) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchBankCards = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('cards')
          .select('*')
          .eq('type', 'bank')
          // ✅ PAS de filtre .eq('published', true) : la RLS gère le fallback
          .order('name', { ascending: true })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        setCards((data as BankCard[]) || [])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useBankCards] Erreur lecture banque cartes:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchBankCards()

    // ✅ Écouter broadcasts sur le channel persistant partagé
    if (!persistentChannel) {
      console.warn('[useBankCards] Channel persistant non disponible')
      return
    }

    // 📢 Broadcast : Carte publiée (Admin → Free)
    const handleCardPublished = ({ payload }: { payload: unknown }) => {
      if (controller.signal.aborted) return

      const { card_id } = payload as { card_id: string }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Realtime-Sync] Event: card_published received`, {
          card_id,
        })
      }

      // Refetch la carte pour l'ajouter au state
      void supabase
        .from('cards')
        .select('*')
        .eq('id', card_id)
        .eq('type', 'bank')
        .single()
        .then(({ data, error }) => {
          if (error || !data || controller.signal.aborted) return

          setCards(prev => {
            // Éviter doublons
            if (prev.some(c => c.id === card_id)) return prev
            return [...prev, data as BankCard].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
          })
        })
    }

    // 📢 Broadcast : Carte dépubliée (Admin → Free)
    const handleCardUnpublished = ({ payload }: { payload: unknown }) => {
      if (controller.signal.aborted) return

      const { card_id } = payload as { card_id: string }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Realtime-Sync] Event: card_unpublished received`, {
          card_id,
        })
      }

      // ⚠️ CRITIQUE : Retirer IMMÉDIATEMENT du state (contournement RLS)
      setCards(prev => prev.filter(card => card.id !== card_id))
    }

    // 📢 Broadcast : Carte supprimée (Admin → Free)
    const handleCardDeleted = ({ payload }: { payload: unknown }) => {
      if (controller.signal.aborted) return

      const { card_id } = payload as { card_id: string }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Realtime-Sync] Event: card_deleted received`, {
          card_id,
        })
      }

      // Retirer immédiatement du state
      setCards(prev => prev.filter(card => card.id !== card_id))
    }

    // ✅ Souscrire aux événements broadcast sur le channel persistant
    persistentChannel
      .on('broadcast', { event: 'card_published' }, handleCardPublished)
      .on('broadcast', { event: 'card_unpublished' }, handleCardUnpublished)
      .on('broadcast', { event: 'card_deleted' }, handleCardDeleted)

    // ✅ Cleanup : Abort controller seulement
    // Note : Les listeners Supabase Realtime n'ont pas de méthode .off()
    // Ils sont automatiquement nettoyés quand le channel est removed par le Provider
    // Le controller.abort() empêche les handlers de faire des setState après démontage
    return () => {
      controller.abort()
    }
  }, [refreshKey, authReady, isAdmin, persistentChannel])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return { cards, loading, error, refresh }
}
