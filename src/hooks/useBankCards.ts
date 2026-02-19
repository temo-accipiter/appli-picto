// src/hooks/useBankCards.ts
// Lecture de la banque de cartes (published = TRUE)
// Accessible à tous les statuts : Visitor (anon), Free, Subscriber, Admin
// DB-first : la RLS contrôle les accès, pas le front
// Contrat §5.2.3 + §3.2.3

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import type { Database } from '@/types/supabase'

type Card = Database['public']['Tables']['cards']['Row']

// Cartes banque publiées
export type BankCard = Card & {
  type: 'bank'
  published: true
  account_id: null
}

interface UseBankCardsReturn {
  cards: BankCard[]
  loading: boolean
  error: Error | null
  refresh: () => void
}

/**
 * Lecture de la banque de cartes publiques (published = TRUE)
 *
 * ✅ Accessible à tous : Visitor (anon), Free, Subscriber, Admin
 * ✅ Images dans bucket bank-images (lecture publique)
 * ✅ DB-first : RLS contrôle l'accès (anon SELECT bank published)
 *
 * ⚠️ NE PAS filtrer côté front : la RLS retourne uniquement les cartes autorisées
 */
export default function useBankCards(): UseBankCardsReturn {
  const [cards, setCards] = useState<BankCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchBankCards = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('cards')
          .select('*')
          .eq('type', 'bank')
          .eq('published', true)
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

    return () => {
      controller.abort()
    }
  }, [refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return { cards, loading, error, refresh }
}
