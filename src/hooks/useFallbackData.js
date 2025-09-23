import { AuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/utils'
import { useContext, useEffect, useState } from 'react'

/**
 * Hook de fallback pour charger les données de base même si les RPC timeout
 * Garantit que l'utilisateur voit ses données même en cas de problème de performance
 */
export function useFallbackData() {
  const { user, authReady } = useContext(AuthContext)
  const [fallbackData, setFallbackData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authReady || !user) {
      setFallbackData(null)
      setLoading(false)
      return
    }

    const loadFallbackData = async () => {
      setLoading(true)

      try {
        console.log('🔄 useFallbackData: chargement des données de fallback...')

        // Charger les tâches de l'utilisateur
        const { data: tasks, error: tasksError } = await supabase
          .from('taches')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Charger les récompenses de l'utilisateur
        const { data: rewards, error: rewardsError } = await supabase
          .from('recompenses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Charger les catégories de l'utilisateur
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        const data = {
          tasks: tasks || [],
          rewards: rewards || [],
          categories: categories || [],
          errors: {
            tasks: tasksError,
            rewards: rewardsError,
            categories: categoriesError,
          },
        }

        setFallbackData(data)
        console.log('✅ useFallbackData: données chargées', {
          tasks: data.tasks.length,
          rewards: data.rewards.length,
          categories: data.categories.length,
        })
      } catch (error) {
        console.error('❌ useFallbackData: erreur:', error)
        setFallbackData({
          tasks: [],
          rewards: [],
          categories: [],
          errors: { general: error },
        })
      } finally {
        setLoading(false)
      }
    }

    loadFallbackData()
  }, [authReady, user])

  return { fallbackData, loading }
}

export default useFallbackData
