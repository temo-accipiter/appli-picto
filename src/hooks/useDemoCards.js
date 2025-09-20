// src/hooks/useDemoCards.js
import { isAbortLike, withAbortSafe } from '@/hooks'
import { supabase } from '@/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Hook pour gérer les cartes de démonstration
 * Récupère les cartes prédéfinies pour les visiteurs
 */
export default function useDemoCards() {
  // Gestion sécurisée de useToast
  let showToast = null
  try {
    const { useToast } = require('@/contexts')
    const toastContext = useToast()
    showToast = toastContext?.show || (() => console.log('Toast non disponible'))
  } catch (error) {
    showToast = (message, type) => console.log(`[${type}] ${message}`)
  }

  const [loading, setLoading] = useState(true)
  const [demoCards, setDemoCards] = useState([])
  const [demoTasks, setDemoTasks] = useState([])
  const [demoRewards, setDemoRewards] = useState([])
  const [error, setError] = useState(null)

  const channelRef = useRef(null)

  // Fonction pour récupérer les cartes de démonstration
  const fetchDemoCards = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await withAbortSafe(
        supabase
          .from('demo_cards')
          .select('*')
          .eq('is_active', true)
          .order('"position"', { ascending: true })
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

      // Séparer les tâches et récompenses
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
  }, [])

  // Charger les cartes initialement
  useEffect(() => {
    fetchDemoCards()
  }, [fetchDemoCards])

  // Écouter les changements en temps réel
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel('demo_cards_changes')
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
  }, [fetchDemoCards])

  // Fonction pour créer une nouvelle carte de démonstration (admin seulement)
  const createDemoCard = useCallback(async (cardData) => {
    try {
      const { data, error } = await supabase
        .from('demo_cards')
        .insert([{
          card_type: cardData.type,
          label: cardData.label,
          imagepath: cardData.imagepath,
          position: cardData.position || 0,
          is_active: true,
        }])
        .select()
        .single()

      if (error) {
        console.error('Erreur création carte démo:', error)
        showToast(`Erreur : ${error.message}`, 'error')
        return null
      }

      showToast('Carte de démonstration créée', 'success')
      await fetchDemoCards() // Rafraîchir la liste
      return data
    } catch (err) {
      console.error('Erreur création carte démo:', err)
      showToast('Erreur lors de la création', 'error')
      return null
    }
  }, [showToast, fetchDemoCards])

  // Fonction pour mettre à jour une carte de démonstration (admin seulement)
  const updateDemoCard = useCallback(async (cardId, updates) => {
    try {
      const { data, error } = await supabase
        .from('demo_cards')
        .update(updates)
        .eq('id', cardId)
        .select()
        .single()

      if (error) {
        console.error('Erreur mise à jour carte démo:', error)
        showToast(`Erreur : ${error.message}`, 'error')
        return null
      }

      showToast('Carte de démonstration mise à jour', 'success')
      await fetchDemoCards() // Rafraîchir la liste
      return data
    } catch (err) {
      console.error('Erreur mise à jour carte démo:', err)
      showToast('Erreur lors de la mise à jour', 'error')
      return null
    }
  }, [showToast, fetchDemoCards])

  // Fonction pour supprimer une carte de démonstration (admin seulement)
  const deleteDemoCard = useCallback(async (cardId) => {
    try {
      const { error } = await supabase
        .from('demo_cards')
        .delete()
        .eq('id', cardId)

      if (error) {
        console.error('Erreur suppression carte démo:', error)
        showToast(`Erreur : ${error.message}`, 'error')
        return false
      }

      showToast('Carte de démonstration supprimée', 'success')
      await fetchDemoCards() // Rafraîchir la liste
      return true
    } catch (err) {
      console.error('Erreur suppression carte démo:', err)
      showToast('Erreur lors de la suppression', 'error')
      return false
    }
  }, [showToast, fetchDemoCards])

  // Fonction pour réorganiser les cartes (admin seulement)
  const reorderDemoCards = useCallback(async (cardIds) => {
    try {
      const updates = cardIds.map((cardId, index) => ({
        id: cardId,
        position: index + 1,
      }))

      const { error } = await supabase
        .from('demo_cards')
        .upsert(updates)

      if (error) {
        console.error('Erreur réorganisation cartes démo:', error)
        showToast(`Erreur : ${error.message}`, 'error')
        return false
      }

      showToast('Ordre des cartes mis à jour', 'success')
      await fetchDemoCards() // Rafraîchir la liste
      return true
    } catch (err) {
      console.error('Erreur réorganisation cartes démo:', err)
      showToast('Erreur lors de la réorganisation', 'error')
      return false
    }
  }, [showToast, fetchDemoCards])

  // Fonction pour activer/désactiver une carte (admin seulement)
  const toggleDemoCard = useCallback(async (cardId, isActive) => {
    return await updateDemoCard(cardId, { is_active: isActive })
  }, [updateDemoCard])

  // Obtenir les cartes par type
  const getCardsByType = useCallback((type) => {
    return demoCards.filter(card => card.card_type === type)
  }, [demoCards])

  // Obtenir les cartes actives
  const getActiveCards = useCallback(() => {
    return demoCards.filter(card => card.is_active)
  }, [demoCards])

  // Obtenir les cartes inactives
  const getInactiveCards = useCallback(() => {
    return demoCards.filter(card => !card.is_active)
  }, [demoCards])

  // Statistiques des cartes
  const getStats = useMemo(() => {
    const total = demoCards.length
    const active = demoCards.filter(card => card.is_active).length
    const tasks = demoTasks.length
    const rewards = demoRewards.length

    return {
      total,
      active,
      inactive: total - active,
      tasks,
      rewards,
    }
  }, [demoCards, demoTasks, demoRewards])

  return {
    // État
    loading,
    error,
    demoCards,
    demoTasks,
    demoRewards,
    
    // Fonctions de récupération
    getCardsByType,
    getActiveCards,
    getInactiveCards,
    
    // Actions (admin)
    createDemoCard,
    updateDemoCard,
    deleteDemoCard,
    reorderDemoCards,
    toggleDemoCard,
    
    // Statistiques
    stats: getStats,
    
    // Utilitaires
    refresh: fetchDemoCards,
  }
}
