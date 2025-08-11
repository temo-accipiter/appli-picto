import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/utils'
import useAuth from './useAuth'
import { useToast } from '@/contexts'

/**
 * Retourne l'état d'abonnement courant de l'utilisateur.
 * - isActive: boolean (active/trialing/past_due et encore dans la période)
 * - status: string (ex: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' | 'none')
 * - subscription: dernière ligne `abonnements` (ou null)
 * - loading: boolean
 * - daysUntilExpiry: nombre de jours restants avant fin de période (ou null si inconnu)
 * - statusDisplay: { label, color, icon } pour l'affichage UI
 * - refresh(): re-fetch manuel
 *
 * Hypothèses légères sur la table `abonnements` :
 * - colonnes : user_id (uuid), status (text), current_period_end (timestamp), created_at (timestamp)
 * - une ligne par abonnement Stripe (on prend la + récente)
 */
export default function useSubscriptionStatus() {
  const { user } = useAuth()
  const { show: showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('none')
  const [subscription, setSubscription] = useState(null)
  const [daysUntilExpiry, setDaysUntilExpiry] = useState(null)

  const channelRef = useRef(null)
  const notifiedKeyRef = useRef(null) // évite les toasts répétés pour le même jour/période

  const parseIsActive = useCallback(sub => {
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
    const { data, error } = await supabase
      .from('abonnements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

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

  // --- (1) Affichage convivial des statuts
  const getStatusDisplay = useCallback((st, sub) => {
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
    () => getStatusDisplay(status, subscription),
    [getStatusDisplay, status, subscription]
  )

  // --- (2) Notification d’expiration (≤ 7 jours, 1 toast max par jour/période)
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

    // clé unique par (date de fin + jours restants) pour éviter le spam
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
    statusDisplay, // { label, color, icon }
  }
}
