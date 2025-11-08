// src/hooks/useRBAC.ts
/**
 * Hook unifié RBAC (Role-Based Access Control)
 *
 * Combine usePermissions + useQuotas + useEntitlements en une seule API cohérente.
 * Ce hook centralise TOUTES les vérifications d'accès, quotas et rôles.
 */

import { usePermissions } from '@/contexts/PermissionsContext'
import { supabase } from '@/utils/supabaseClient'
import { ROLE } from '@/utils/roleUtils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

const NEAR_LIMIT_RATIO = 0.8

type ContentType = 'task' | 'reward' | 'category'
type QuotaPeriod = 'total' | 'monthly'

interface QuotaConfig {
  limit: number
  period: QuotaPeriod
}

interface QuotaMap {
  max_tasks?: QuotaConfig
  max_rewards?: QuotaConfig
  max_categories?: QuotaConfig
}

interface UsageMap {
  max_tasks?: number
  max_rewards?: number
  max_categories?: number
  monthly_tasks?: number
  monthly_rewards?: number
  monthly_categories?: number
}

interface QuotaInfo {
  limit: number
  current: number
  remaining: number
  percentage: number
  period: QuotaPeriod
  isAtLimit: boolean
  isNearLimit: boolean
}

interface QuotaRow {
  quota_type: string
  quota_limit: number
  quota_period: QuotaPeriod
}

interface UsageData {
  tasks?: number
  rewards?: number
  categories?: number
}

interface GetUsageFastResult {
  quotas?: QuotaRow[]
  usage?: UsageData
  monthly_usage?: UsageData
}

interface UseRBACReturn {
  ready: boolean
  loading: boolean
  role: string
  isVisitor: boolean
  isAdmin: boolean
  isUnknown: boolean
  isFree: boolean
  isSubscriber: boolean
  can: (featureName: string) => boolean
  canAll: (featureNames: string[]) => boolean
  canAny: (featureNames: string[]) => boolean
  quotas: QuotaMap
  usage: UsageMap
  canCreate: (contentType: ContentType) => boolean
  canCreateTask: () => boolean
  canCreateReward: () => boolean
  canCreateCategory: () => boolean
  getQuotaInfo: (contentType: ContentType) => QuotaInfo | null
  getMonthlyQuotaInfo: (contentType: ContentType) => QuotaInfo | null
  refreshQuotas: () => void
  reload: () => void
}

export default function useRBAC(): UseRBACReturn {
  const permissions = usePermissions()

  // État pour quotas/usage
  const [quotasLoading, setQuotasLoading] = useState(false)
  const [quotas, setQuotas] = useState<QuotaMap>({})
  const [usage, setUsage] = useState<UsageMap>({})
  const [initialLoad, setInitialLoad] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const isFreeAccount = permissions.role === ROLE.FREE

  console.log('🔍 [useRBAC] État:', {
    role: permissions.role,
    isFreeAccount,
    ready: permissions.ready,
    isVisitor: permissions.isVisitor,
    isAdmin: permissions.isAdmin,
  })

  // ✅ CORRECTIF : Fonction stable pour éviter récréation channels
  const fetchQuotasStable = useCallback(async () => {
    // Pas de quotas pour: visiteurs, unknown, ou admins
    if (
      !permissions.ready ||
      permissions.isUnknown ||
      permissions.isVisitor ||
      permissions.isAdmin
    ) {
      setQuotas({})
      setUsage({})
      setQuotasLoading(false)
      setInitialLoad(false)
      return
    }

    if (!initialLoad) setQuotasLoading(true)

    try {
      // Récupérer l'user_id pour appeler la fonction RPC
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) {
        setQuotas({})
        setUsage({})
        setQuotasLoading(false)
        setInitialLoad(false)
        return
      }

      const { data, error } = await supabase.rpc('get_usage_fast', {
        p_user_id: user.id,
      })

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

      const result = data as GetUsageFastResult
      const quotasData = result.quotas || []
      const usageData = result.usage || {}
      // ✅ PHASE 1: Récupérer monthly_usage depuis get_usage_fast()
      const monthlyUsageData = result.monthly_usage || {}

      const quotasMap: QuotaMap = {}
      quotasData.forEach(q => {
        // Mapper quota_type vers le format attendu (max_*)
        const key: keyof QuotaMap | null =
          q.quota_type === 'task'
            ? 'max_tasks'
            : q.quota_type === 'reward'
              ? 'max_rewards'
              : q.quota_type === 'category'
                ? 'max_categories'
                : null

        if (key) {
          quotasMap[key] = {
            limit: q.quota_limit,
            period: q.quota_period, // 'monthly' ou 'total'
          }
        }
      })

      const usageMap: UsageMap = {
        // Compteurs totaux (pour quotas period='total')
        max_tasks: usageData.tasks || 0,
        max_rewards: usageData.rewards || 0,
        max_categories: usageData.categories || 0,
        // ✅ PHASE 1: Compteurs mensuels (pour quotas period='monthly')
        monthly_tasks: monthlyUsageData.tasks || 0,
        monthly_rewards: monthlyUsageData.rewards || 0,
        monthly_categories: monthlyUsageData.categories || 0,
      }

      setQuotas(quotasMap)
      setUsage(usageMap)
      setQuotasLoading(false)
      setInitialLoad(false)

      console.log('✅ [useRBAC] Quotas chargés:', {
        role: permissions.role,
        isFree: permissions.role === ROLE.FREE,
        quotasMap,
        usageMap,
      })
    } catch (err) {
      console.error('❌ [useRBAC] Erreur lors du chargement des quotas:', {
        error: err,
        role: permissions.role,
        message: (err as Error)?.message || 'Unknown error',
      })
      setQuotas({})
      setUsage({})
      setQuotasLoading(false)
      setInitialLoad(false)
    }
  }, [
    permissions.ready,
    permissions.isUnknown,
    permissions.isVisitor,
    permissions.isAdmin,
    permissions.role,
    initialLoad,
  ])

  // ✅ Wrapper stable qui ne change jamais
  const fetchQuotas = useCallback(() => {
    fetchQuotasStable()
  }, [fetchQuotasStable])

  // Chargement initial
  useEffect(() => {
    if (permissions.ready) fetchQuotasStable()
  }, [permissions.ready, fetchQuotasStable])

  // ✅ CORRECTIF : Realtime avec dépendances stables
  useEffect(() => {
    if (!permissions.ready || !isFreeAccount) {
      // Cleanup si conditions changent
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    // Cleanup du channel précédent
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // ✅ Utiliser fetchQuotasStable directement (stable)
    const handleChange = () => {
      setTimeout(() => fetchQuotasStable(), 100)
    }

    // ✅ CORRECTIF CRITIQUE : Nom de channel FIXE pour éviter l'accumulation de channels zombies
    // AVANT: Chaque remount créait un nouveau channel avec Date.now() → fuite mémoire
    // MAINTENANT: Nom fixe → le cleanup fonctionne correctement
    const channel = supabase
      .channel('rbac:quotas:changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taches' },
        handleChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recompenses' },
        handleChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        handleChange
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [permissions.ready, isFreeAccount, fetchQuotasStable])

  // Helpers de vérification
  const canCreate = useCallback(
    (contentType: ContentType): boolean => {
      if (!isFreeAccount) return true

      // Mapper le type de contenu vers la clé de quota
      const key: keyof QuotaMap | null =
        contentType === 'task'
          ? 'max_tasks'
          : contentType === 'reward'
            ? 'max_rewards'
            : contentType === 'category'
              ? 'max_categories'
              : null

      if (!key || !quotas[key]) return true

      // ✅ PHASE 1: Utiliser le bon compteur selon quota_period
      const quotaPeriod = quotas[key]!.period || 'total'
      const limit = quotas[key]!.limit

      let currentUsage: number
      if (quotaPeriod === 'monthly') {
        // Quotas mensuels : utiliser monthly_tasks/monthly_rewards/monthly_categories
        const monthlyKey: keyof UsageMap =
          contentType === 'task'
            ? 'monthly_tasks'
            : contentType === 'reward'
              ? 'monthly_rewards'
              : 'monthly_categories'
        currentUsage = usage[monthlyKey] ?? 0
      } else {
        // Quotas totaux : utiliser max_tasks/max_rewards/max_categories
        currentUsage = usage[key] ?? 0
      }

      return currentUsage < limit
    },
    [isFreeAccount, quotas, usage]
  )

  const getQuotaInfo = useCallback(
    (contentType: ContentType): QuotaInfo | null => {
      const key: keyof QuotaMap | null =
        contentType === 'task'
          ? 'max_tasks'
          : contentType === 'reward'
            ? 'max_rewards'
            : contentType === 'category'
              ? 'max_categories'
              : null

      if (!key || !quotas[key]) return null

      // ✅ PHASE 1: Utiliser le bon compteur selon quota_period
      const quotaPeriod = quotas[key]!.period || 'total'
      const limit = quotas[key]!.limit

      let current: number
      if (quotaPeriod === 'monthly') {
        // Quotas mensuels : utiliser monthly_tasks/monthly_rewards/monthly_categories
        const monthlyKey: keyof UsageMap =
          contentType === 'task'
            ? 'monthly_tasks'
            : contentType === 'reward'
              ? 'monthly_rewards'
              : 'monthly_categories'
        current = usage[monthlyKey] ?? 0
      } else {
        // Quotas totaux : utiliser max_tasks/max_rewards/max_categories
        current = usage[key] ?? 0
      }

      const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0

      return {
        limit,
        current,
        remaining: Math.max(0, limit - current),
        percentage,
        period: quotaPeriod, // Ajouter period pour que l'UI sache si c'est mensuel ou total
        isAtLimit: current >= limit,
        isNearLimit:
          current >= Math.floor(limit * NEAR_LIMIT_RATIO) && current < limit,
      }
    },
    [quotas, usage]
  )

  // ✅ PHASE 1: getMonthlyQuotaInfo() est maintenant un alias de getQuotaInfo()
  // getQuotaInfo() gère automatiquement les quotas mensuels ET totaux selon period
  const getMonthlyQuotaInfo = useCallback(
    (contentType: ContentType): QuotaInfo | null => {
      // Simplement appeler getQuotaInfo qui gère déjà les quotas mensuels
      const info = getQuotaInfo(contentType)

      // Retourner null si pas de quota ou si le quota n'est pas mensuel
      if (!info || info.period !== 'monthly') {
        return null
      }

      return info
    },
    [getQuotaInfo]
  )

  // API unifiée
  const rbac = useMemo<UseRBACReturn>(
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
      getMonthlyQuotaInfo,
      refreshQuotas: () => fetchQuotas(),

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
      getMonthlyQuotaInfo,
      fetchQuotas,
    ]
  )

  return rbac
}
