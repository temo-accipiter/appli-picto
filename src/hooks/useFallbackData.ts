// src/hooks/useFallbackData.ts
// Fallback data loader

import { AuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/utils/supabaseClient'
import { useContext, useEffect, useState } from 'react'

interface FallbackErrors {
  tasks?: Error | null
  rewards?: Error | null
  categories?: Error | null
  general?: unknown
}

interface FallbackMeta {
  hasAny: boolean
  hasError: boolean
}

interface FallbackDataType {
  tasks: unknown[]
  rewards: unknown[]
  categories: unknown[]
  errors: FallbackErrors
  meta: FallbackMeta
}

interface UseFallbackDataReturn {
  fallbackData: FallbackDataType | null
  loading: boolean
}

export function useFallbackData(): UseFallbackDataReturn {
  const authContext = useContext(AuthContext)
  if (!authContext) {
    throw new Error('useFallbackData must be used within an AuthProvider')
  }
  const { user, authReady } = authContext
  const [fallbackData, setFallbackData] = useState<FallbackDataType | null>(
    null
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Pas de user → aucun fallback côté compte authentifié
    if (!authReady || !user) {
      setFallbackData(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const loadFallbackData = async () => {
      setLoading(true)
      try {
        // Tâches
        const { data: tasks, error: tasksError } = await supabase
          .from('taches')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Récompenses
        const { data: rewards, error: rewardsError } = await supabase
          .from('recompenses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Catégories
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (cancelled) return

        const safe: FallbackDataType = {
          tasks: tasks || [],
          rewards: rewards || [],
          categories: categories || [],
          errors: {
            tasks: tasksError as Error | null,
            rewards: rewardsError as Error | null,
            categories: categoriesError as Error | null,
          },
          meta: {
            // vrai si au moins une collection contient des éléments
            hasAny:
              (tasks?.length || 0) > 0 ||
              (rewards?.length || 0) > 0 ||
              (categories?.length || 0) > 0,
            // vrai si au moins une requête a échoué (timeout/RLS/etc.)
            hasError: !!tasksError || !!rewardsError || !!categoriesError,
          },
        }

        // 🔧 Changement FONDAMENTAL :
        // - Si utilisateur AUTHENTIFIÉ et que TOUT est vide et SANS erreur → pas de fallback
        if (!safe.meta.hasAny && !safe.meta.hasError) {
          setFallbackData(null)
        } else {
          setFallbackData(safe)
        }
      } catch (error) {
        if (cancelled) return
        console.error('❌ useFallbackData: erreur:', error)
        // En cas d'exception globale, on renvoie un fallback "vide" mais marqué en erreur
        setFallbackData({
          tasks: [],
          rewards: [],
          categories: [],
          errors: { general: error },
          meta: { hasAny: false, hasError: true },
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFallbackData()
    return () => {
      cancelled = true
    }
  }, [authReady, user])

  return { fallbackData, loading }
}

export default useFallbackData
