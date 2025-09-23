// src/hooks/useQuotas-optimized.js
// Version ultra-optimisée utilisant la RPC get_usage_fast
import { supabase } from '@/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import useAuth from './useAuth'

// Seuil visuel « proche de la limite » (80%)
const NEAR_LIMIT_RATIO = 0.8

export default function useQuotas() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [quotas, setQuotas] = useState({})
  const [usage, setUsage] = useState({})
  const [isFreeAccount, setIsFreeAccount] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  const channelRef = useRef(null)

  const fetchQuotas = useCallback(async () => {
    if (!user?.id) {
      setQuotas({})
      setUsage({})
      setIsFreeAccount(false)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    // Ne pas bloquer l'UI au premier rendu
    if (!initialLoad) setLoading(true)

    try {
      // 🚀 RPC UNIQUE - Une seule requête pour tout récupérer
      const { data, error } = await supabase.rpc('get_usage_fast', {
        p_user_id: user.id,
      })

      if (error) {
        console.error('useQuotas: erreur RPC get_usage_fast', error)
        setQuotas({})
        setUsage({})
        setIsFreeAccount(false)
        setLoading(false)
        setInitialLoad(false)
        return
      }

      if (!data) {
        console.warn('useQuotas: aucune donnée retournée par get_usage_fast')
        setQuotas({})
        setUsage({})
        setIsFreeAccount(false)
        setLoading(false)
        setInitialLoad(false)
        return
      }

      // Extraire les données de la réponse JSON
      const role = data.role
      const quotasData = data.quotas || []
      const usageData = data.usage || {}

      // Déterminer si c'est un compte gratuit
      const isFree = role?.name === 'free'
      setIsFreeAccount(isFree)

      if (!isFree) {
        // Pas de limites pour payants/admin
        setQuotas({})
        setUsage({})
        setLoading(false)
        setInitialLoad(false)
        return
      }

      // Organiser les quotas par type
      const quotasMap = {}
      quotasData.forEach(q => {
        quotasMap[q.quota_type] = {
          limit: q.quota_limit,
          period: q.quota_period,
        }
      })

      // Organiser l'usage
      const usageMap = {
        max_tasks: usageData.tasks || 0,
        max_rewards: usageData.rewards || 0,
        max_categories: usageData.categories || 0,
        // Quotas mensuels désactivés pour l'instant
        monthly_tasks: 0,
        monthly_rewards: 0,
        monthly_categories: 0,
      }

      setQuotas(quotasMap)
      setUsage(usageMap)
      setLoading(false)
      setInitialLoad(false)

      if (import.meta.env.DEV) {
        console.log('🚀 useQuotas (RPC optimisé):', {
          role: role?.name,
          quotas: quotasMap,
          usage: usageMap,
        })
      }
    } catch (err) {
      console.error('useQuotas: erreur fetch quotas RPC', err)
      setQuotas({})
      setUsage({})
      setIsFreeAccount(false)
      setLoading(false)
      setInitialLoad(false)
    }
  }, [user?.id, initialLoad])

  // Chargement initial (en arrière-plan)
  useEffect(() => {
    if (user?.id) fetchQuotas()
  }, [fetchQuotas, user?.id])

  // Écoute temps réel (les triggers maintiennent automatiquement les compteurs)
  useEffect(() => {
    if (!user?.id || !isFreeAccount) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`quotas:user:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'taches',
          filter: `user_id=eq.${user.id}`,
        },
        () => setTimeout(fetchQuotas, 100)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recompenses',
          filter: `user_id=eq.${user.id}`,
        },
        () => setTimeout(fetchQuotas, 100)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${user.id}`,
        },
        () => setTimeout(fetchQuotas, 100)
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [user?.id, isFreeAccount, fetchQuotas])

  // Autorisations
  const canCreate = useCallback(
    contentType => {
      if (!isFreeAccount) return true
      const totalKey =
        contentType === 'task'
          ? 'max_tasks'
          : contentType === 'reward'
            ? 'max_rewards'
            : contentType === 'category'
              ? 'max_categories'
              : null

      if (!totalKey || !quotas[totalKey]) return true
      const limit = quotas[totalKey].limit
      const current = usage[totalKey] ?? 0
      return current < limit
    },
    [isFreeAccount, quotas, usage]
  )

  const canCreateTask = useCallback(() => canCreate('task'), [canCreate])
  const canCreateReward = useCallback(() => canCreate('reward'), [canCreate])
  const canCreateCategory = useCallback(
    () => canCreate('category'),
    [canCreate]
  )

  // Infos structurées pour l'UI (inclut pourcentage/états)
  const getQuotaInfo = useCallback(
    contentType => {
      const totalKey =
        contentType === 'task'
          ? 'max_tasks'
          : contentType === 'reward'
            ? 'max_rewards'
            : contentType === 'category'
              ? 'max_categories'
              : null

      if (!totalKey || !quotas[totalKey]) return null

      const limit = quotas[totalKey].limit
      const current = usage[totalKey] ?? 0
      const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0
      const isAtLimit = current >= limit
      const isNearLimit =
        !isAtLimit && current >= Math.floor(limit * NEAR_LIMIT_RATIO)

      return {
        limit,
        current,
        remaining: Math.max(0, limit - current),
        percentage,
        isAtLimit,
        isNearLimit,
      }
    },
    [quotas, usage]
  )

  const getMonthlyQuotaInfo = useCallback(
    contentType => {
      const monthlyKey =
        contentType === 'task'
          ? 'monthly_tasks'
          : contentType === 'reward'
            ? 'monthly_rewards'
            : contentType === 'category'
              ? 'monthly_categories'
              : null

      if (!monthlyKey || !quotas[monthlyKey]) return null

      const limit = quotas[monthlyKey].limit
      const current = usage[monthlyKey] ?? 0
      const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0
      const isAtLimit = current >= limit
      const isNearLimit =
        !isAtLimit && current >= Math.floor(limit * NEAR_LIMIT_RATIO)

      return {
        limit,
        current,
        remaining: Math.max(0, limit - current),
        percentage,
        isAtLimit,
        isNearLimit,
      }
    },
    [quotas, usage]
  )

  const refreshQuotas = useCallback(() => {
    fetchQuotas()
  }, [fetchQuotas])

  return {
    loading,
    initialLoad,
    quotas,
    usage,
    isFreeAccount,
    canCreate,
    canCreateTask,
    canCreateReward,
    canCreateCategory,
    getQuotaInfo,
    getMonthlyQuotaInfo,
    refreshQuotas,
  }
}
