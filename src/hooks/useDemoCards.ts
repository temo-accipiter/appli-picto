// src/hooks/useDemoCards.ts
/**
 * Hook pour les cartes de démonstration (mode visiteur)
 * Fournit des tâches et récompenses prédéfinies sans compte utilisateur
 * Permet également la gestion admin des cartes de démo
 */
import { supabase } from '@/utils/supabaseClient'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAbortLike, useAuth, withAbortSafe } from '@/hooks'

interface DemoCard {
  id: string
  card_type: 'task' | 'reward'
  label: string
  imagepath?: string | null
  position: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface DemoTache {
  id: string
  label: string
  fait: boolean
  position: number
  imagepath?: string | null
  category_id?: string | null
  isDemo: true
}

interface DemoRecompense {
  id: string
  label: string
  selected?: boolean
  imagepath?: string | null
  isDemo: true
}

interface DemoCardStats {
  total: number
  active: number
  inactive: number
  tasks: number
  rewards: number
}

interface CreateDemoCardInput {
  type: 'task' | 'reward'
  label: string
  imagepath?: string
  position: number
}

interface UseDemoCardsReturn {
  // Données
  demoCards: DemoCard[]
  demoTasks: DemoTache[]
  demoRewards: DemoRecompense[]

  // État
  loading: boolean
  error: string | null

  // Statistiques
  stats: DemoCardStats

  // Sélecteurs
  getCardsByType: (type: 'task' | 'reward') => DemoCard[]
  getActiveCards: () => DemoCard[]
  getInactiveCards: () => DemoCard[]

  // Actions admin
  createDemoCard: (input: CreateDemoCardInput) => Promise<DemoCard | null>
  updateDemoCard: (
    id: string,
    updates: Partial<DemoCard>
  ) => Promise<DemoCard | null>
  deleteDemoCard: (id: string) => Promise<boolean>
  reorderDemoCards: (orderedIds: string[]) => Promise<boolean>
  toggleDemoCard: (id: string, isActive: boolean) => Promise<DemoCard | null>

  // Refresh manuel
  refresh: () => Promise<void>
}

export default function useDemoCards(): UseDemoCardsReturn {
  const { user, authReady } = useAuth()

  const [demoCards, setDemoCards] = useState<DemoCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Fonction pour charger les cartes de démo
  const fetchDemoCards = useCallback(async () => {
    // ✅ Ne charger que pour les visiteurs (pas d'utilisateur connecté)
    if (!authReady) {
      setLoading(true)
      return
    }

    if (user) {
      // Utilisateur connecté : pas de cartes de démo
      setDemoCards([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError, aborted } = await withAbortSafe(
        supabase.from('demo_cards').select('*').eq('is_active', true).order('position')
      )

      if (aborted || (fetchError && isAbortLike(fetchError))) {
        if (import.meta.env.DEV)
          console.debug('useDemoCards: requête abortée (ignoré)')
        setLoading(false)
        return
      }

      if (fetchError) {
        console.error('Erreur chargement cartes démo:', fetchError)
        setError('Impossible de charger les cartes de démonstration')
        setDemoCards([])
        setLoading(false)
        return
      }

      setDemoCards(data || [])
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error('Erreur inattendue chargement cartes démo:', err)
      setError('Erreur inattendue')
      setDemoCards([])
      setLoading(false)
    }
  }, [user, authReady])

  // Charger les cartes au montage
  useEffect(() => {
    fetchDemoCards()
  }, [fetchDemoCards])

  // ✅ Écouter les changements en temps réel (pour les admins)
  useEffect(() => {
    // Cleanup du channel précédent
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Ne pas écouter si utilisateur connecté
    if (user) {
      return
    }

    const channel = supabase
      .channel('demo_cards:all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demo_cards',
        },
        () => {
          fetchDemoCards()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, fetchDemoCards])

  // Transformer les cartes en tâches de démo
  const demoTasks = useMemo<DemoTache[]>(() => {
    return demoCards
      .filter(card => card.card_type === 'task' && card.is_active)
      .map(card => ({
        id: card.id,
        label: card.label,
        fait: false,
        position: card.position,
        imagepath: card.imagepath,
        category_id: null,
        isDemo: true as const,
      }))
  }, [demoCards])

  // Transformer les cartes en récompenses de démo
  const demoRewards = useMemo<DemoRecompense[]>(() => {
    return demoCards
      .filter(card => card.card_type === 'reward' && card.is_active)
      .map(card => ({
        id: card.id,
        label: card.label,
        selected: false,
        imagepath: card.imagepath,
        isDemo: true as const,
      }))
  }, [demoCards])

  // Statistiques
  const stats = useMemo<DemoCardStats>(() => {
    const total = demoCards.length
    const active = demoCards.filter(card => card.is_active).length
    const inactive = total - active
    const tasks = demoCards.filter(card => card.card_type === 'task').length
    const rewards = demoCards.filter(card => card.card_type === 'reward')
      .length

    return { total, active, inactive, tasks, rewards }
  }, [demoCards])

  // Sélecteurs
  const getCardsByType = useCallback(
    (type: 'task' | 'reward') => {
      return demoCards.filter(card => card.card_type === type)
    },
    [demoCards]
  )

  const getActiveCards = useCallback(() => {
    return demoCards.filter(card => card.is_active)
  }, [demoCards])

  const getInactiveCards = useCallback(() => {
    return demoCards.filter(card => !card.is_active)
  }, [demoCards])

  // Actions admin

  const createDemoCard = useCallback(
    async (input: CreateDemoCardInput): Promise<DemoCard | null> => {
      try {
        const payload = {
          card_type: input.type,
          label: input.label,
          imagepath: input.imagepath || null,
          position: input.position,
          is_active: true,
        }

        const { data, error: insertError } = await supabase
          .from('demo_cards')
          .insert(payload)
          .select()
          .single()

        if (insertError) {
          console.error('Erreur création carte démo:', insertError)
          return null
        }

        await fetchDemoCards()
        return data
      } catch (err) {
        console.error('Erreur inattendue création carte démo:', err)
        return null
      }
    },
    [fetchDemoCards]
  )

  const updateDemoCard = useCallback(
    async (
      id: string,
      updates: Partial<DemoCard>
    ): Promise<DemoCard | null> => {
      try {
        const { data, error: updateError } = await supabase
          .from('demo_cards')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (updateError) {
          console.error('Erreur mise à jour carte démo:', updateError)
          return null
        }

        await fetchDemoCards()
        return data
      } catch (err) {
        console.error('Erreur inattendue mise à jour carte démo:', err)
        return null
      }
    },
    [fetchDemoCards]
  )

  const deleteDemoCard = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('demo_cards')
          .delete()
          .eq('id', id)

        if (deleteError) {
          console.error('Erreur suppression carte démo:', deleteError)
          return false
        }

        await fetchDemoCards()
        return true
      } catch (err) {
        console.error('Erreur inattendue suppression carte démo:', err)
        return false
      }
    },
    [fetchDemoCards]
  )

  const reorderDemoCards = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      try {
        // Créer les updates avec les nouvelles positions
        const updates = orderedIds.map((id, index) => ({
          id,
          position: index,
        }))

        const { error: upsertError } = await supabase
          .from('demo_cards')
          .upsert(updates)

        if (upsertError) {
          console.error('Erreur réorganisation cartes démo:', upsertError)
          return false
        }

        await fetchDemoCards()
        return true
      } catch (err) {
        console.error('Erreur inattendue réorganisation cartes démo:', err)
        return false
      }
    },
    [fetchDemoCards]
  )

  const toggleDemoCard = useCallback(
    async (id: string, isActive: boolean): Promise<DemoCard | null> => {
      return await updateDemoCard(id, { is_active: isActive })
    },
    [updateDemoCard]
  )

  return {
    // Données
    demoCards,
    demoTasks,
    demoRewards,

    // État
    loading,
    error,

    // Statistiques
    stats,

    // Sélecteurs
    getCardsByType,
    getActiveCards,
    getInactiveCards,

    // Actions admin
    createDemoCard,
    updateDemoCard,
    deleteDemoCard,
    reorderDemoCards,
    toggleDemoCard,

    // Refresh manuel
    refresh: fetchDemoCards,
  }
}
