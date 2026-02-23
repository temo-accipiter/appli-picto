import { useMemo } from 'react'
import useAccountStatus from './useAccountStatus'

export function useSubscriptionStatus() {
  const { status, isSubscriber, loading, error } = useAccountStatus()

  const statusDisplay = useMemo(() => {
    switch (status) {
      case 'subscriber':
        return { label: 'Actif', icon: '', color: 'success' }
      case 'free':
        return { label: 'Gratuit', icon: '', color: 'default' }
      case 'admin':
        return { label: 'Admin', icon: '', color: 'info' }
      default:
        return { label: 'Inconnu', icon: '', color: 'default' }
    }
  }, [status])

  return {
    loading,
    error,
    status,
    isSubscriber,
    isActive: isSubscriber,
    isTrial: false,
    currentPeriodEnd: null,
    daysUntilExpiry: null,
    isExpiringSoon: false,
    subscription: null,
    statusDisplay,
  }
}

export default useSubscriptionStatus
