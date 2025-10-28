// src/hooks/useRBAC.js
/**
 * Hook unifié RBAC (Role-Based Access Control)
 *
 * Combine usePermissions + useQuotas + useEntitlements en une seule API cohérente.
 * Ce hook centralise TOUTES les vérifications d'accès, quotas et rôles.
 *
 * @returns {Object} RBAC API
 * @returns {boolean} return.ready - True quand permissions ET quotas sont chargés
 * @returns {boolean} return.loading - True pendant le chargement
 * @returns {string} return.role - Rôle actuel ('visitor' | 'free' | 'abonne' | 'admin' | 'unknown')
 *
 * @returns {boolean} return.isVisitor - True si visiteur (non connecté)
 * @returns {boolean} return.isAdmin - True si administrateur
 * @returns {boolean} return.isUnknown - True si rôle inconnu (état transitoire)
 * @returns {boolean} return.isFree - True si compte gratuit
 * @returns {boolean} return.isSubscriber - True si abonné payant
 *
 * @returns {Function} return.can - Vérifie UNE permission : can('feature_name')
 * @returns {Function} return.canAll - Vérifie TOUTES les permissions : canAll(['f1', 'f2'])
 * @returns {Function} return.canAny - Vérifie AU MOINS UNE permission : canAny(['f1', 'f2'])
 *
 * @returns {Object} return.quotas - Limites par type (max_tasks, max_rewards, etc.)
 * @returns {Object} return.usage - Utilisation actuelle par type
 * @returns {Function} return.canCreate - Vérifie si création possible : canCreate('task')
 * @returns {Function} return.canCreateTask - Shortcut : peut créer une tâche ?
 * @returns {Function} return.canCreateReward - Shortcut : peut créer une récompense ?
 * @returns {Function} return.canCreateCategory - Shortcut : peut créer une catégorie ?
 * @returns {Function} return.getQuotaInfo - Infos quota : getQuotaInfo('task') → {limit, current, remaining, percentage, isAtLimit, isNearLimit}
 * @returns {Function} return.getMonthlyQuotaInfo - Infos quota mensuel (si applicable)
 * @returns {Function} return.refreshQuotas - Recharger manuellement les quotas
 *
 * @returns {Function} return.reload - Recharger permissions ET quotas
 *
 * @example
 * // Vérifier un rôle
 * const { isAdmin, isFree } = useRBAC()
 * if (isAdmin) { /* ... *\/ }
 *
 * @example
 * // Vérifier des permissions
 * const { can, canAll } = useRBAC()
 * if (can('edit_tasks')) { /* ... *\/ }
 * if (canAll(['edit_tasks', 'delete_tasks'])) { /* ... *\/ }
 *
 * @example
 * // Vérifier quotas
 * const { canCreateTask, getQuotaInfo } = useRBAC()
 * if (!canCreateTask()) {
 *   const info = getQuotaInfo('task')
 *   alert(`Limite atteinte : ${info.current}/${info.limit}`)
 * }
 *
 * Phase 2-3 - Refactoring RBAC
 * - Élimine la duplication entre useQuotas et useEntitlements
 * - API unifiée pour toutes les vérifications RBAC
 * - Single RPC call (get_usage_fast)
 * - Realtime updates pour free accounts
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

  console.log('🔍 [useRBAC] État:', {
    role: permissions.role,
    isFreeAccount,
    ready: permissions.ready,
    isVisitor: permissions.isVisitor,
    isAdmin: permissions.isAdmin,
  })

  // Fetch quotas depuis get_usage_fast
  const fetchQuotas = useCallback(async () => {
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

      const quotasData = data.quotas || []
      const usageData = data.usage || {}

      const quotasMap = {}
      quotasData.forEach(q => {
        // Mapper quota_type vers le format attendu (max_*)
        const key =
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
            period: q.quota_period,
          }
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

      console.log('✅ [useRBAC] Quotas chargés:', {
        role: permissions.role,
        isFree: permissions.role === ROLE.FREE,
        quotasMap,
        usageMap,
      })
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
    permissions.isAdmin,
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

  const getMonthlyQuotaInfo = useCallback(
    contentType => {
      const key =
        contentType === 'task'
          ? 'monthly_tasks'
          : contentType === 'reward'
            ? 'monthly_rewards'
            : contentType === 'category'
              ? 'monthly_categories'
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
