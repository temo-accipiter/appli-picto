// src/hooks/useDemoCards.js
import { isAbortLike, withAbortSafe } from '@/hooks'
import { supabase } from '@/utils/supabaseClient'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks' // pour savoir si visiteur

/**
 * Hook pour gérer les cartes de démonstration (visiteurs uniquement).
 * - Si utilisateur authentifié : ne retourne rien (tableaux vides), pas de fetch, pas de canal.
 */
export default function useDemoCards() {
  const { user, authReady } = useAuth()

  const [loading, setLoading] = useState(true)
  const [demoCards, setDemoCards] = useState([])
  const [demoTasks, setDemoTasks] = useState([])
  const [demoRewards, setDemoRewards] = useState([])
  const [error, setError] = useState(null)

  const channelRef = useRef(null)

  const isVisitor = authReady && !user

  const fetchDemoCards = useCallback(async () => {
    if (!isVisitor) return // 🚫 connecté => on ne charge pas les démos
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await withAbortSafe(
        supabase
          .from('demo_cards')
          .select('*')
          .eq('is_active', true)
          .order('position', { ascending: true }) // nom de colonne sans quotes
      )

      if (error && isAbortLike(error)) {
        if (import.meta.env.DEV) console.debug('useDemoCards: abort ignoré')
        setLoading(false)
        return
      }

      if (error) {
        console.warn('useDemoCards: erreur fetch cartes', error)
        setError('Impossible de charger les cartes de démonstration')
        setLoading(false)
        return
      }

      const cards = data || []
      setDemoCards(cards)

      const tasks = cards.filter(card => card.card_type === 'task')
      const rewards = cards.filter(card => card.card_type === 'reward')

      setDemoTasks(tasks)
      setDemoRewards(rewards)
      setLoading(false)
    } catch (err) {
      console.error('useDemoCards: erreur inattendue', err)
      setError('Erreur lors du chargement des cartes de démonstration')
      setLoading(false)
    }
  }, [isVisitor])

  // Chargement initial seulement pour visiteurs
  useEffect(() => {
    if (!authReady) return
    if (!isVisitor) {
      // utilisateur connecté : expose un état "vide prêt"
      setLoading(false)
      setDemoCards([])
      setDemoTasks([])
      setDemoRewards([])
      setError(null)
      return
    }
    fetchDemoCards()
  }, [authReady, isVisitor, fetchDemoCards])

  // Abonnement temps réel seulement pour visiteurs
  useEffect(() => {
    // Nettoie tout canal existant
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    if (!isVisitor) return // 🚫 pas de canal si connecté

    const channel = supabase
      .channel('demo_cards_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demo_cards' },
        () => fetchDemoCards()
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [isVisitor, fetchDemoCards])

  // Statistiques mémoïsées
  const getStats = useMemo(() => {
    const total = demoCards.length
    const active = demoCards.filter(card => card.is_active).length
    const tasks = demoTasks.length
    const rewards = demoRewards.length
    return { total, active, inactive: total - active, tasks, rewards }
  }, [demoCards, demoTasks, demoRewards])

  // Sélecteurs utilitaires
  const getCardsByType = useCallback(
    type => demoCards.filter(card => card.card_type === type),
    [demoCards]
  )
  const getActiveCards = useCallback(
    () => demoCards.filter(card => card.is_active),
    [demoCards]
  )
  const getInactiveCards = useCallback(
    () => demoCards.filter(card => !card.is_active),
    [demoCards]
  )

  // Actions (admin) — gardées pour compat, mais n’auront d’effet que côté visiteur/admin
  const createDemoCard = useCallback(
    async cardData => {
      const showToast = (message, type) => console.log(`[${type}] ${message}`)
      try {
        const { data, error } = await supabase
          .from('demo_cards')
          .insert([
            {
              card_type: cardData.type,
              label: cardData.label,
              imagepath: cardData.imagepath,
              position: cardData.position || 0,
              is_active: true,
            },
          ])
          .select()
          .single()
        if (error) {
          showToast(`Erreur : ${error.message}`, 'error')
          return null
        }
        showToast('Carte de démonstration créée', 'success')
        await fetchDemoCards()
        return data
      } catch (err) {
        console.error('Erreur création carte démo:', err)
        return null
      }
    },
    [fetchDemoCards]
  )

  const updateDemoCard = useCallback(
    async (cardId, updates) => {
      const showToast = (message, type) => console.log(`[${type}] ${message}`)
      try {
        const { data, error } = await supabase
          .from('demo_cards')
          .update(updates)
          .eq('id', cardId)
          .select()
          .single()
        if (error) {
          showToast(`Erreur : ${error.message}`, 'error')
          return null
        }
        showToast('Carte de démonstration mise à jour', 'success')
        await fetchDemoCards()
        return data
      } catch (err) {
        console.error('Erreur mise à jour carte démo:', err)
        return null
      }
    },
    [fetchDemoCards]
  )

  const deleteDemoCard = useCallback(
    async cardId => {
      const showToast = (message, type) => console.log(`[${type}] ${message}`)
      try {
        const { error } = await supabase
          .from('demo_cards')
          .delete()
          .eq('id', cardId)
        if (error) {
          showToast(`Erreur : ${error.message}`, 'error')
          return false
        }
        showToast('Carte de démonstration supprimée', 'success')
        await fetchDemoCards()
        return true
      } catch (err) {
        console.error('Erreur suppression carte démo:', err)
        return false
      }
    },
    [fetchDemoCards]
  )

  const reorderDemoCards = useCallback(
    async cardIds => {
      const showToast = (message, type) => console.log(`[${type}] ${message}`)
      try {
        const updates = cardIds.map((cardId, index) => ({
          id: cardId,
          position: index + 1,
        }))
        const { error } = await supabase.from('demo_cards').upsert(updates)
        if (error) {
          showToast(`Erreur : ${error.message}`, 'error')
          return false
        }
        showToast('Ordre des cartes mis à jour', 'success')
        await fetchDemoCards()
        return true
      } catch (err) {
        console.error('Erreur réorganisation cartes démo:', err)
        return false
      }
    },
    [fetchDemoCards]
  )

  const toggleDemoCard = useCallback(
    async (cardId, isActive) => updateDemoCard(cardId, { is_active: isActive }),
    [updateDemoCard]
  )

  return {
    // État
    loading,
    error,
    demoCards,
    demoTasks,
    demoRewards,

    // Sélecteurs
    getCardsByType,
    getActiveCards,
    getInactiveCards,

    // Actions (admin)
    createDemoCard,
    updateDemoCard,
    deleteDemoCard,
    reorderDemoCards,
    toggleDemoCard,

    // Stats
    stats: getStats,

    // Utilitaire
    refresh: fetchDemoCards,
  }
}
