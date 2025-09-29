// src/hooks/useSubscriptionStatus.js
import { AuthContext } from '@/contexts/AuthContext'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const _withTimeout = (p, ms) =>
  Promise.race([p, sleep(ms).then(() => ({ __timeout: true }))])

export function useSubscriptionStatus() {
  const { user, authReady } = useContext(AuthContext)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null) // 'active' | 'trialing' | null
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(null)

  // Empêche chevauchements (StrictMode) et "double-run" des effets
  const _runIdRef = useRef(0)

  useEffect(() => {
    // 🚀 SOLUTION ULTRA-SIMPLE : Pas de requêtes, juste des fallbacks
    if (!authReady) {
      setLoading(true)
      return
    }

    if (!user?.id) {
      setStatus(null)
      setCurrentPeriodEnd(null)
      setLoading(false)
      return
    }

    // Utilisateur connecté = pas d'abonnement par défaut (mode free)
    console.log(
      "🔍 useSubscriptionStatus: utilisateur connecté, pas d'abonnement"
    )
    setStatus(null)
    setCurrentPeriodEnd(null)
    setLoading(false)
  }, [authReady, user?.id])

  const isTrial = status === 'trialing'
  const isActive = status === 'active' || isTrial

  return useMemo(
    () => ({
      loading,
      status,
      isActive,
      isTrial,
      currentPeriodEnd,
      isExpiringSoon:
        !!currentPeriodEnd &&
        new Date(currentPeriodEnd) <
          new Date(Date.now() + 7 * 24 * 3600 * 1000),
    }),
    [loading, status, isActive, isTrial, currentPeriodEnd]
  )
}

export default useSubscriptionStatus
