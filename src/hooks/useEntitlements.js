import { AuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/utils'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const withTimeout = (p, ms) =>
  Promise.race([p, sleep(ms).then(() => ({ __timeout: true }))])

// Cache simple pour éviter les appels multiples
const roleCache = new Map()
const CACHE_DURATION = 5000 // 5 secondes

export function useEntitlements() {
  const { user, authReady } = useContext(AuthContext)
  const [role, setRole] = useState('unknown') // tri-state au démarrage
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  // Empêche les chevauchements (React 18 / StrictMode)
  const runIdRef = useRef(0)

  useEffect(() => {
    let alive = true
    const runId = ++runIdRef.current
    const timerId = `entitlements-${runId}-${Date.now()}`
    let timerStarted = false

    const startTimer = () => {
      if (!timerStarted) {
        console.time(timerId)
        timerStarted = true
      }
    }

    const endTimer = () => {
      if (timerStarted) {
        try {
          console.timeEnd(timerId)
        } catch {
          // Timer déjà terminé, ignorer l'erreur
        }
        timerStarted = false
      }
    }

    const resolveRole = async () => {
      // 1) Attente de l'auth
      if (!authReady) {
        setLoading(true)
        return
      }

      // 2) Pas connecté → visitor
      if (!user) {
        if (!alive || runIdRef.current !== runId) return
        startTimer()
        setRole('visitor')
        setSubscription(null)
        setLoading(false)
        endTimer()
        return
      }

      setLoading(true)

      try {
        // 3) Vérifier le cache d'abord
        const cacheKey = user.id
        const cached = roleCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log('🔍 useEntitlements: rôle depuis le cache:', cached.role)
          startTimer()
          setRole(cached.role)
          setLoading(false)
          endTimer()
          return
        }

        // 4) Petit délai pour éviter les courses entre hooks
        await sleep(100)

        // 5) Tenter le rôle via RPC (avec timeout pour ne jamais bloquer l'UI)
        startTimer()
        console.log(
          '🔍 useEntitlements: appel get_usage_fast pour user:',
          user.id
        )
        const { data, error, __timeout } = await withTimeout(
          supabase.rpc('get_usage_fast', { p_user_id: user.id }),
          5000 // Augmenté à 5 secondes
        )

        console.log('🔍 useEntitlements: réponse get_usage_fast:', {
          data,
          error,
          __timeout,
        })

        if (!alive || runIdRef.current !== runId) return

        if (!__timeout && !error && data?.role?.name) {
          const roleName = String(data.role.name)
          console.log(
            '🔍 useEntitlements: rôle déterminé via get_usage_fast:',
            roleName
          )

          // Mettre en cache
          roleCache.set(cacheKey, {
            role: roleName,
            timestamp: Date.now(),
          })

          setRole(roleName)
          setLoading(false)
          endTimer()
          return
        }

        // 6) Si get_usage_fast a échoué, fallback intelligent avec données
        if (__timeout) {
          console.warn(
            '🔍 useEntitlements: get_usage_fast timeout 5s, fallback vers free (utilisateur connecté)'
          )
          // Si l'utilisateur est connecté mais get_usage_fast timeout,
          // on assume qu'il est au minimum "free" (pas "visitor")
          setRole('free')
          setSubscription(null)

          // 🔧 Charger les données de base même en cas de timeout
          try {
            console.log(
              '🔍 useEntitlements: chargement des données de fallback...'
            )
            const fallbackData = {
              role: { name: 'free' },
              quotas: {
                max_tasks: 4,
                max_rewards: 2,
                max_categories: 2,
                monthly_tasks: 0,
                monthly_rewards: 0,
              },
              usage: {
                max_tasks: 0,
                max_rewards: 0,
                max_categories: 0,
                monthly_tasks: 0,
                monthly_rewards: 0,
              },
            }
            setSubscription(fallbackData)
            console.log('✅ useEntitlements: données de fallback chargées')
          } catch (e) {
            console.warn('❌ useEntitlements: erreur chargement fallback:', e)
          }
        } else if (error) {
          console.warn(
            '🔍 useEntitlements: get_usage_fast erreur, fallback vers free (utilisateur connecté)',
            error
          )
          setRole('free')
          setSubscription(null)
        } else {
          console.warn(
            '🔍 useEntitlements: get_usage_fast a échoué, fallback vers visitor'
          )
          setRole('visitor')
          setSubscription(null)
        }
      } finally {
        if (alive && runIdRef.current === runId) {
          setLoading(false)
          endTimer()
        }
      }
    }

    resolveRole()
    return () => {
      alive = false
    }
  }, [authReady, user])

  const isTrialPeriod = subscription?.status === 'trialing'
  const isActiveSubscription =
    subscription?.status === 'active' || isTrialPeriod

  return useMemo(
    () => ({
      role,
      subscription,
      loading,
      isTrialPeriod,
      isActiveSubscription,
      isExpiringSoon:
        !!subscription?.current_period_end &&
        new Date(subscription.current_period_end) <
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isVisitor: role === 'visitor',
      isSubscriber: role === 'abonne',
      isAdmin: role === 'admin',
      isFree: role === 'free',
      isStaff: role === 'staff',
      userId: user?.id,
      isUnknown: role === 'unknown',
      isDetermined: role !== 'unknown',
    }),
    [role, subscription, loading, isTrialPeriod, isActiveSubscription, user?.id]
  )
}
