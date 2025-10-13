// src/hooks/useEntitlements.js
// Objectif : exposer le rôle (depuis PermissionsContext) + un snapshot d'entitlements
// (usage/quotas/features actifs) via RPC rapide côté base (get_usage_fast).
//
// ⚠️ Rôle = toujours lu depuis PermissionsContext → source unique RBAC
//    Ce hook ajoute seulement des informations “entitlements/usage”.

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from '@/utils/supabaseClient'
import { PermissionsContext } from '@/contexts'
import { ROLE } from '@/utils/roleUtils'

// Petit cache mémoire (process) pour lisser les lectures durant 5s
const CACHE_TTL_MS = 5000
let lastCache = { at: 0, payload: null }

async function fetchUsageFast(signal) {
  // On garde une seule RPC compacte côté DB (performante)
  const { data, error } = await supabase.rpc('get_usage_fast', {}, { signal })
  if (error) throw error
  return data || {}
}

/**
 * @deprecated Use useRBAC() instead
 *
 * Ce hook est déprécié depuis Phase 2 du refactoring RBAC (janvier 2025).
 * Migrez vers useRBAC() pour une API unifiée qui combine permissions + quotas + rôles.
 *
 * @see {@link useRBAC} - Hook unifié recommandé
 * @see RBAC_GUIDE.md - Guide de migration complet
 *
 * @example
 * // ❌ Ancien code (déprécié)
 * const { canCreateMoreTaches, isSubscriber, quotas } = useEntitlements()
 *
 * // ✅ Nouveau code (recommandé)
 * const { canCreateTask, isSubscriber, quotas } = useRBAC()
 */
export default function useEntitlements() {
  // Warning en développement
  if (import.meta.env.DEV) {
    console.warn(
      '⚠️ useEntitlements() is deprecated. Use useRBAC() instead.\n' +
        'See src/hooks/RBAC_GUIDE.md for migration guide.'
    )
  }
  const {
    ready: permsReady,
    role,
    isVisitor,
  } = useContext(PermissionsContext) || {
    ready: false,
    role: ROLE.VISITOR,
    isVisitor: true,
  }

  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const load = useCallback(async () => {
    setError(null)

    // Si visiteur, on peut court-circuiter : pas d’entitlements serveur
    if (isVisitor) {
      setUsage({
        quotas: {
          max_taches: 10,
          max_images: 10,
          max_recompenses: 3,
        },
        counts: {
          taches: 0,
          images: 0,
          recompenses: 0,
        },
        features: {}, // aucune feature payante
      })
      setLoading(false)
      return
    }

    // Anti-doublon : abort d’un fetch en cours
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      // Cache 5s pour éviter un bombardement en navigation
      const now = Date.now()
      if (lastCache.payload && now - lastCache.at < CACHE_TTL_MS) {
        setUsage(lastCache.payload)
        setLoading(false)
        return
      }

      const data = await fetchUsageFast(ctrl.signal)

      // Structure attendue (tolérante au schéma)
      const normalized = {
        quotas: {
          max_taches: data?.quotas?.max_taches ?? data?.max_taches ?? 50,
          max_images: data?.quotas?.max_images ?? data?.max_images ?? 50,
          max_recompenses:
            data?.quotas?.max_recompenses ?? data?.max_recompenses ?? 10,
        },
        counts: {
          taches: data?.counts?.taches ?? data?.taches ?? 0,
          images: data?.counts?.images ?? data?.images ?? 0,
          recompenses: data?.counts?.recompenses ?? data?.recompenses ?? 0,
        },
        // features booléennes (côté back si tu renvoies déjà un map)
        features: data?.features ?? {},
        // date d’expiration éventuelle (ex: abonnement)
        expires_at: data?.expires_at ?? null,
        subscription_status: data?.subscription_status ?? null,
      }

      lastCache = { at: now, payload: normalized }
      setUsage(normalized)
      setLoading(false)
    } catch (e) {
      if (e?.name === 'AbortError') return
      setError(e)
      setUsage(null)
      setLoading(false)
    }
  }, [isVisitor])

  // Charger au montage + quand le user/role devient prêt
  useEffect(() => {
    if (!permsReady) return
    setLoading(true)
    load()
  }, [permsReady, load])

  // Helpers dérivés
  const isSubscriber = useMemo(
    () => role === ROLE.ABONNE || role === 'subscriber',
    [role]
  )
  const isFree = useMemo(() => role === ROLE.FREE, [role])

  const canCreateMoreTaches = useMemo(() => {
    if (!usage) return false
    return usage.counts.taches < usage.quotas.max_taches
  }, [usage])

  const canCreateMoreImages = useMemo(() => {
    if (!usage) return false
    return usage.counts.images < usage.quotas.max_images
  }, [usage])

  const canCreateMoreRecompenses = useMemo(() => {
    if (!usage) return false
    return usage.counts.recompenses < usage.quotas.max_recompenses
  }, [usage])

  const entitlementsReady = permsReady && !loading

  return {
    ready: entitlementsReady, // prêt = permissions prêtes + snapshot usage chargé
    loading, // état de chargement local usage
    error, // éventuelle erreur usage
    role, // ← rôle unique, depuis PermissionsContext
    isVisitor,
    isSubscriber,
    isFree,

    usage, // { quotas, counts, features, expires_at, subscription_status }
    quotas: usage?.quotas ?? null, // accès direct
    counts: usage?.counts ?? null, // accès direct

    canCreateMoreTaches,
    canCreateMoreImages,
    canCreateMoreRecompenses,

    refresh: load, // recharger usage/entitlements
  }
}
