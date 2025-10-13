// src/hooks/useRBAC.js
/**
 * Hook unifié RBAC (Role-Based Access Control)
 *
 * Combine usePermissions + useQuotas + useEntitlements en une seule API cohérente
 *
 * @example
 * const { role, can, canAll, canCreateTask, quotaInfo } = useRBAC()
 *
 * Phase 2 - Refactoring RBAC
 * Élimine la duplication entre useQuotas et useEntitlements
 * Fournit une API unifiée pour toutes les vérifications RBAC
 */

import { usePermissions } from '@/contexts/PermissionsContext'
import { supabase } from '@/utils/supabaseClient'
import { ROLE } from '@/utils/roleUtils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const NEAR_LIMIT_RATIO = 0.8

export default function useRBAC() {
  const permissions = usePermissions()

  // État pour quotas/usage
  const [quotasLoading, setQuotasLoading] = useState(false)
  const [quotas, setQuotas] = useState({})
  const [usage, setUsage] = useState({})
  const [initialLoad, setInitialLoad] = useState(true)
  const channelRef = useRef(null)

  const isFreeAccount = permissions.role === ROLE.FREE

  // Fetch quotas depuis get_usage_fast
  const fetchQuotas = useCallback(async () => {
    if (!permissions.ready || permissions.isUnknown || permissions.isVisitor) {
      setQuotas({})
      setUsage({})
      setQuotasLoading(false)
      setInitialLoad(false)
      return
    }

    if (!initialLoad) setQuotasLoading(true)

    try {
      const { data, error } = await supabase.rpc('get_usage_fast')

      if (error || !data) {
        setQuotas({})
        setUsage({})
        setQuotasLoading(false)
        setInitialLoad(false)
        return
      }

      if (permissions.role !== ROLE.FREE) {
        setQuotas({})
        setUsage({})
        setQuotasLoading(false)
        setInitialLoad(false)
        return
      }

      const quotasData = data.quotas || []
      const usageData = data.usage || {}

      const quotasMap = {}
      quotasData.forEach(q => {
        quotasMap[q.quota_type] = {
          limit: q.quota_limit,
          period: q.quota_period,
        }
      })

      const usageMap = {
        max_tasks: usageData.tasks || 0,
        max_rewards: usageData.rewards || 0,
        max_categories: usageData.categories || 0,
        monthly_tasks: 0,
        monthly_rewards: 0,
        monthly_categories: 0,
      }

      setQuotas(quotasMap)
      setUsage(usageMap)
      setQuotasLoading(false)
      setInitialLoad(false)
    } catch (err) {
      console.error('useRBAC: erreur fetch quotas', err)
      setQuotas({})
      setUsage({})
      setQuotasLoading(false)
      setInitialLoad(false)
    }
  }, [
    permissions.ready,
    permissions.isUnknown,
    permissions.isVisitor,
    permissions.role,
    initialLoad,
  ])

  // Chargement initial
  useEffect(() => {
    if (permissions.ready) fetchQuotas()
  }, [permissions.ready, fetchQuotas])

  // Realtime pour free accounts
  useEffect(() => {
    if (!permissions.ready || !isFreeAccount) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`rbac:quotas:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taches' },
        () => setTimeout(fetchQuotas, 100)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recompenses' },
        () => setTimeout(fetchQuotas, 100)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => setTimeout(fetchQuotas, 100)
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [permissions.ready, isFreeAccount, fetchQuotas])

  // Helpers de vérification
  const canCreate = useCallback(
    contentType => {
      if (!isFreeAccount) return true
      const key =
        contentType === 'task'
          ? 'max_tasks'
          : contentType === 'reward'
            ? 'max_rewards'
            : contentType === 'category'
              ? 'max_categories'
              : null
      if (!key || !quotas[key]) return true
      return (usage[key] ?? 0) < quotas[key].limit
    },
    [isFreeAccount, quotas, usage]
  )

  const getQuotaInfo = useCallback(
    contentType => {
      const key =
        contentType === 'task'
          ? 'max_tasks'
          : contentType === 'reward'
            ? 'max_rewards'
            : contentType === 'category'
              ? 'max_categories'
              : null
      if (!key || !quotas[key]) return null
      const limit = quotas[key].limit
      const current = usage[key] ?? 0
      const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0
      return {
        limit,
        current,
        remaining: Math.max(0, limit - current),
        percentage,
        isAtLimit: current >= limit,
        isNearLimit:
          current >= Math.floor(limit * NEAR_LIMIT_RATIO) && current < limit,
      }
    },
    [quotas, usage]
  )

  // API unifiée
  const rbac = useMemo(
    () => ({
      // Permissions
      ready: permissions.ready && !quotasLoading,
      loading: permissions.loading || quotasLoading,
      role: permissions.role,
      isVisitor: permissions.isVisitor,
      isAdmin: permissions.isAdmin,
      isUnknown: permissions.isUnknown,
      isFree: isFreeAccount,
      isSubscriber: permissions.role === ROLE.ABONNE,

      // Fonctions permissions
      can: permissions.can,
      canAll: permissions.canAll,
      canAny: permissions.canAny,

      // Quotas
      quotas,
      usage,
      canCreate,
      canCreateTask: () => canCreate('task'),
      canCreateReward: () => canCreate('reward'),
      canCreateCategory: () => canCreate('category'),
      getQuotaInfo,

      // Reload
      reload: () => {
        permissions.reload()
        fetchQuotas()
      },
    }),
    [
      permissions,
      quotasLoading,
      isFreeAccount,
      quotas,
      usage,
      canCreate,
      getQuotaInfo,
      fetchQuotas,
    ]
  )

  return rbac
}
