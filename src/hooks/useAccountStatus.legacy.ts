import useAccountStatusDbFirst from './useAccountStatus'

export default function useAccountStatus() {
  const { status, loading, error } = useAccountStatusDbFirst()

  const accountStatus = status ? 'active' : null

  const statusDisplay = {
    label: accountStatus ? 'Actif' : 'Inconnu',
    color: accountStatus ? 'success' : 'default',
    icon: '',
    description: accountStatus
      ? 'Etat de compte actif'
      : 'Etat de compte non disponible',
  }

  const noopAction = async () => false
  const noopRefresh = async () => undefined

  return {
    accountStatus,
    loading,
    error,
    isSuspended: false,
    isPendingVerification: false,
    isScheduledForDeletion: false,
    deletionDate: null,
    statusDisplay,
    canUseApp: accountStatus === 'active',
    canCreateContent: accountStatus === 'active',
    changeAccountStatus: noopAction,
    cancelDeletion: noopAction,
    scheduleDeletion: noopAction,
    refresh: noopRefresh,
  }
}
