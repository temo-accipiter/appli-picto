// src/hooks/useSubscriptionStatus.js
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import useAuth from './useAuth'

const ACTIVE_SET = new Set(['trialing', 'active', 'past_due', 'paused'])

export function useSubscriptionStatus() {
  const { user, authReady } = useAuth()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null) // 'active' | 'trialing' | 'past_due' | 'paused' | null
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(null)

  const runIdRef = useRef(0)

  useEffect(() => {
    const runId = ++runIdRef.current
    let alive = true

    async function fetchStatus() {
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

      setLoading(true)
      try {
        // On lit la ligne la plus récente de l’utilisateur (webhooks alimentent `abonnements`)
        const { data, error } = await supabase
          .from('abonnements')
          .select(
            'status,current_period_end,cancel_at,cancel_at_period_end,price_id,plan'
          )
          .eq('user_id', user.id)
          .order('current_period_end', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error

        const st = data?.status ?? null
        const cpe = data?.current_period_end ?? null

        if (alive && runIdRef.current === runId) {
          setStatus(st)
          setCurrentPeriodEnd(cpe)
          setLoading(false)
        }
      } catch (e) {
        console.warn('useSubscriptionStatus: fallback → null', e)
        if (alive && runIdRef.current === runId) {
          setStatus(null)
          setCurrentPeriodEnd(null)
          setLoading(false)
        }
      }
    }

    fetchStatus()
    return () => {
      alive = false
    }
  }, [authReady, user?.id])

  const isTrial = status === 'trialing'
  const isActive = ACTIVE_SET.has(status || '')

  return useMemo(() => {
    const end = currentPeriodEnd ? new Date(currentPeriodEnd) : null
    const in7d = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    return {
      loading,
      status,
      isActive,
      isTrial,
      currentPeriodEnd,
      daysUntilExpiry:
        end && !isNaN(end) ? Math.ceil((+end - Date.now()) / 86400000) : null,
      isExpiringSoon: !!end && end < in7d,
    }
  }, [loading, status, isActive, isTrial, currentPeriodEnd])
}

export default useSubscriptionStatus
