// src/hooks/useBankCards.ts
// Lecture de la banque de cartes (published + fallback unpublished si référencées)
// Accessible à tous les statuts : Visitor (anon), Free, Subscriber, Admin
// DB-first : la RLS contrôle les accès ET le fallback unpublished, pas le front
// Contrat §5.2.3 + §3.2.3 + BLOCKER 5 TSA (pas de disparition soudaine)

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
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
 *
 * ⚠️ NE PAS filtrer côté front sur published : la RLS gère le fallback
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

    return () => {
      controller.abort()
    }
  }, [refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return { cards, loading, error, refresh }
}
