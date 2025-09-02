import { supabase } from '@/utils'
import { useEffect, useState } from 'react'

/**
 * Hook pour récupérer les données de démonstration
 * Récupère les tâches et récompenses marquées comme visibles en démo
 */
export const useDemoData = () => {
  const [demoTaches, setDemoTaches] = useState([])
  const [demoRecompenses, setDemoRecompenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDemoData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Récupérer les tâches de démo (limitées à 3)
        const { data: taches, error: tachesError } = await supabase
          .from('taches')
          .select('*')
          .eq('visible_en_demo', true)
          .order('position', { ascending: true })
          .limit(3)

        if (tachesError) {
          console.error(
            'Erreur lors de la récupération des tâches de démo:',
            tachesError
          )
          setError('Impossible de charger les tâches de démo')
        } else {
          setDemoTaches(taches || [])
        }

        // Récupérer les récompenses de démo (limitées à 1)
        const { data: recompenses, error: recompensesError } = await supabase
          .from('recompenses')
          .select('*')
          .eq('visible_en_demo', true)
          .limit(1)

        if (recompensesError) {
          console.error(
            'Erreur lors de la récupération des récompenses de démo:',
            recompensesError
          )
          setError('Impossible de charger les récompenses de démo')
        } else {
          setDemoRecompenses(recompenses || [])
        }
      } catch (err) {
        console.error(
          'Erreur générale lors de la récupération des données de démo:',
          err
        )
        setError('Erreur lors du chargement des données de démo')
      } finally {
        setLoading(false)
      }
    }

    fetchDemoData()
  }, [])

  // Fonction pour rafraîchir les données
  const refreshDemoData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [tachesResult, recompensesResult] = await Promise.all([
        supabase
          .from('taches')
          .select('*')
          .eq('visible_en_demo', true)
          .order('position', { ascending: true })
          .limit(3),
        supabase
          .from('recompenses')
          .select('*')
          .eq('visible_en_demo', true)
          .limit(1),
      ])

      if (tachesResult.error) {
        console.error(
          'Erreur lors du rafraîchissement des tâches:',
          tachesResult.error
        )
      } else {
        setDemoTaches(tachesResult.data || [])
      }

      if (recompensesResult.error) {
        console.error(
          'Erreur lors du rafraîchissement des récompenses:',
          recompensesResult.error
        )
      } else {
        setDemoRecompenses(recompensesResult.data || [])
      }
    } catch (err) {
      console.error('Erreur lors du rafraîchissement:', err)
      setError('Erreur lors du rafraîchissement des données')
    } finally {
      setLoading(false)
    }
  }

  return {
    demoTaches,
    demoRecompenses,
    loading,
    error,
    refreshDemoData,
  }
}
