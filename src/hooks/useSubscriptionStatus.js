// src/hooks/useSubscriptionStatus.js
import { useToast } from '@/contexts'
import { supabase } from '@/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useAuth from './useAuth'
import { withAbortSafe, isAbortLike } from '@/hooks'

export default function useSubscriptionStatus() {
  const { user } = useAuth()
  const { show: showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('none')
  const [subscription, setSubscription] = useState(null)
  const [daysUntilExpiry, setDaysUntilExpiry] = useState(null)

  const channelRef = useRef(null)
  const notifiedKeyRef = useRef(null)

  const parseIsActive = useCallback((sub) => {
    if (!sub) return false
    const ACTIVE_STATUSES = ['active', 'trialing', 'past_due']
    const inActiveStatus = ACTIVE_STATUSES.includes(
      (sub.status || '').toLowerCase()
    )
    if (sub.current_period_end) {
      const now = new Date()
      const end = new Date(sub.current_period_end)
      return inActiveStatus && end > now
    }
    return inActiveStatus
  }, [])

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null)
      setStatus('none')
      setLoading(false)
      setDaysUntilExpiry(null)
      return
    }

    setLoading(true)
    const { data, error } = await withAbortSafe(
      supabase
        .from('abonnements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    )

    if (error && isAbortLike(error)) {
      if (import.meta.env.DEV) console.debug('useSubscriptionStatus: abort ignoré')
      setLoading(false)
      return
    }

    if (error) {
      console.warn('useSubscriptionStatus: erreur fetch abonnements', error)
      setSubscription(null)
      setStatus('none')
      setLoading(false)
      setDaysUntilExpiry(null)
      return
    }

    setSubscription(data || null)
    setStatus((data?.status || 'none').toLowerCase())
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!user?.id) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`abonnements:user:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'abonnements',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refresh()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id, refresh])

  const isActive = parseIsActive(subscription)

  const getStatusDisplay = useCallback((st) => {
    switch ((st || '').toLowerCase()) {
      case 'active':
        return { label: 'Actif', color: 'success', icon: '✅' }
      case 'trialing':
        return { label: 'Essai gratuit', color: 'info', icon: '🆓' }
      case 'past_due':
        return { label: 'Paiement en retard', color: 'warning', icon: '⚠️' }
      case 'canceled':
        return { label: 'Annulé', color: 'error', icon: '❌' }
      case 'incomplete':
        return { label: 'Incomplet', color: 'warning', icon: '⏳' }
      case 'unpaid':
        return { label: 'Impayé', color: 'error', icon: '💳' }
      case 'none':
        return { label: 'Aucun', color: 'default', icon: '—' }
      default:
        return { label: 'Inconnu', color: 'default', icon: '❓' }
    }
  }, [])

  const statusDisplay = useMemo(
    () => getStatusDisplay(status),
    [getStatusDisplay, status]
  )

  // --- Notification d’expiration (≤ 7 jours)
  useEffect(() => {
    if (!subscription?.current_period_end) {
      setDaysUntilExpiry(null)
      return
    }

    const endDate = new Date(subscription.current_period_end)
    const now = new Date()
    const msLeft = endDate.getTime() - now.getTime()
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

    setDaysUntilExpiry(Number.isFinite(daysLeft) ? daysLeft : null)

    if (!isActive) return
    if (daysLeft <= 0) return
    if (daysLeft > 7) return

    const key = `${endDate.toISOString().slice(0, 10)}-${daysLeft}`
    if (notifiedKeyRef.current === key) return

    showToast(
      `Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}.`,
      'warning'
    )
    notifiedKeyRef.current = key
  }, [subscription, isActive, showToast])

  return {
    isActive,
    status,
    subscription,
    loading,
    refresh,
    daysUntilExpiry,
    statusDisplay,
  }
}
