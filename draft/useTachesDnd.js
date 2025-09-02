import { useAuth } from '@/hooks'
import { supabase } from '@/utils'
import { useCallback, useEffect, useState } from 'react'

export default function useTachesDnd(onChange) {
  const [taches, setTaches] = useState([])
  const [doneMap, setDone] = useState({})
  const { user } = useAuth()

  const loadTaches = useCallback(async (retryCount = 0) => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('taches')
        .select('*')
        .eq('user_id', user.id) // 🔐 visibilité sécurisée
        .eq('aujourdhui', true)
        .order('position', { ascending: true })

      if (error) {
        console.error('❌ Erreur fetch Supabase :', error)
        
        // En développement, afficher plus de détails pour le debug
        if (import.meta.env.DEV) {
          console.warn('🔍 Détails de l\'erreur Supabase:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
        }
        
        // Retry automatique pour les erreurs réseau (max 3 tentatives)
        if (retryCount < 3 && (
          error.message?.includes('NetworkError') || 
          error.message?.includes('fetch') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('Impossible de récupérer') ||
          error.message?.includes('timeout') ||
          error.message?.includes('abort')
        )) {
          // Délais adaptés à votre connexion SFR (plus longs pour 40ms ping)
          const delay = retryCount === 0 ? 2000 : retryCount === 1 ? 4000 : 6000
          console.warn(`🔄 Tentative de reconnexion ${retryCount + 1}/3 dans ${delay/1000}s...`)
          setTimeout(() => loadTaches(retryCount + 1), delay)
          return
        }
        
        return
      }

      // Vérifier que data existe et est un tableau
      if (!data || !Array.isArray(data)) {
        console.warn('⚠️ Données invalides reçues de Supabase:', data)
        setTaches([])
        setDone({})
        onChange(0, 0)
        return
      }

      setTaches(data)

      const initDone = Object.fromEntries(
        data.map(t => [t.id, t.fait === true || t.fait === 1])
      )
      setDone(initDone)

      const doneCount = Object.values(initDone).filter(Boolean).length
      onChange(doneCount, data.length)
    } catch (err) {
      console.error('❌ Erreur inattendue lors du chargement des tâches:', err)
      if (import.meta.env.DEV) {
        console.warn('🔍 Détails de l\'erreur:', err)
      }
      
      // Retry pour les erreurs inattendues aussi
      if (retryCount < 3) {
        console.warn(`🔄 Tentative de reconnexion après erreur inattendue ${retryCount + 1}/3...`)
        setTimeout(() => loadTaches(retryCount + 1), 1000 * (retryCount + 1))
        return
      }
    }
  }, [onChange, user?.id])

  useEffect(() => {
    loadTaches()
  }, [loadTaches])

  const toggleDone = async (id, wasDone) => {
    try {
      const { error } = await supabase
        .from('taches')
        .update({ fait: !wasDone })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ Erreur mise à jour tâche:', error)
        if (import.meta.env.DEV) {
          console.warn('🔍 Détails de l\'erreur:', error)
        }
        return
      }

      const updated = { ...doneMap, [id]: !wasDone }
      setDone(updated)

      const count = Object.values(updated).filter(Boolean).length
      onChange(count, taches.length)
    } catch (err) {
      console.error('❌ Erreur inattendue lors de la mise à jour de la tâche:', err)
      if (import.meta.env.DEV) {
        console.warn('🔍 Détails de l\'erreur:', err)
      }
    }
  }

  const resetAll = async () => {
    try {
      const { error } = await supabase
        .from('taches')
        .update({ fait: false })
        .eq('aujourdhui', true)
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ Erreur reset tâches:', error)
        if (import.meta.env.DEV) {
          console.warn('🔍 Détails de l\'erreur:', error)
        }
        return
      }

      const reset = Object.fromEntries(taches.map(t => [t.id, false]))
      setDone(reset)
      onChange(0, taches.length)
    } catch (err) {
      console.error('❌ Erreur inattendue lors du reset des tâches:', err)
      if (import.meta.env.DEV) {
        console.warn('🔍 Détails de l\'erreur:', err)
      }
    }
  }

  const moveTask = (activeId, overId) => {
    let newList = []
    setTaches(prev => {
      const oldIndex = prev.findIndex(t => t.id.toString() === activeId)
      const newIndex = prev.findIndex(t => t.id.toString() === overId)
      const arr = [...prev]
      const [moved] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, moved)
      newList = arr
      return arr
    })
    return newList
  }

  const saveOrder = async (list) => {
    try {
      // Traitement par petits lots pour éviter les timeouts
      const batchSize = 5
      for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize)
        await Promise.all(
          batch.map((t, index) =>
            supabase
              .from('taches')
              .update({ position: i + index })
              .eq('id', t.id)
              .eq('user_id', user.id)
          )
        )
        
        // Petit délai entre les lots pour votre connexion SFR
        if (i + batchSize < list.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      await loadTaches()
    } catch (error) {
      console.error('❌ Erreur sauvegarde ordre:', error)
      if (import.meta.env.DEV) {
        console.warn('🔍 Détails de l\'erreur:', error)
      }
      
      // Retry de la sauvegarde en cas d'échec
      setTimeout(() => saveOrder(list), 2000)
    }
  }

  return {
    taches,
    doneMap,
    toggleDone,
    resetAll,
    moveTask,
    saveOrder,
  }
}
