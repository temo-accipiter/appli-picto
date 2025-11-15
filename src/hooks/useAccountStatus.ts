// src/hooks/useAccountStatus.js
import { isAbortLike, withAbortSafe } from '@/hooks'
import { supabase } from '@/utils/supabaseClient'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useAuth from './useAuth'

interface ProfileData {
  account_status: string
  deletion_scheduled_at: string | null
}

/**
 * Hook pour gérer les états de compte utilisateur
 * Gère les états : active, suspended, deletion_scheduled, pending_verification
 */
export default function useAccountStatus() {
  const { user, authReady } = useAuth()

  const [loading, setLoading] = useState(true)
  const [accountStatus, setAccountStatus] = useState(null)
  const [isSuspended, setIsSuspended] = useState(false)
  const [isPendingVerification, setIsPendingVerification] = useState(false)
  const [isScheduledForDeletion, setIsScheduledForDeletion] = useState(false)
  const [deletionDate, setDeletionDate] = useState(null)

  const channelRef = useRef(null)

  // Fonction pour récupérer l'état du compte
  const fetchAccountStatus = useCallback(async () => {
    // ✅ CORRECTIF : Attendre que l'auth soit prête avant de charger
    if (!authReady || !user?.id) {
      setAccountStatus(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error, aborted } = await withAbortSafe(
        supabase
          .from('profiles')
          .select('account_status, deletion_scheduled_at')
          .eq('id', user.id)
          .single()
      )

      if (aborted || (error && isAbortLike(error))) {
        if (import.meta.env.DEV) console.debug('useAccountStatus: abort ignoré')
        setLoading(false)
        return
      }

      if (error) {
        console.warn('useAccountStatus: erreur fetch profil', error)
        setAccountStatus('active') // Fallback par défaut
        setLoading(false)
        return
      }

      const profileData = data as ProfileData | null
      const status = profileData?.account_status || 'active'
      setAccountStatus(status)
      setIsSuspended(status === 'suspended')
      setIsPendingVerification(status === 'pending_verification')
      setIsScheduledForDeletion(status === 'deletion_scheduled')
      setDeletionDate(profileData?.deletion_scheduled_at || null)
      setLoading(false)
    } catch (err) {
      console.error('useAccountStatus: erreur inattendue', err)
      setAccountStatus('active') // Fallback par défaut
      setLoading(false)
    }
  }, [user?.id, authReady])

  // Charger l'état initial
  useEffect(() => {
    fetchAccountStatus()
  }, [fetchAccountStatus])

  // ✅ CORRECTIF : Écouter les changements avec dépendances stables
  useEffect(() => {
    if (!user?.id) {
      // Cleanup si user disparaît
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

    // ✅ Handler stable
    const handleUpdate = () => {
      fetchAccountStatus()
    }

    const channel = supabase
      .channel(`account_status:user:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        handleUpdate
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id, fetchAccountStatus])

  // Fonction pour changer l'état du compte (admin seulement)
  const changeAccountStatus = useCallback(
    async (newStatus, reason = null) => {
      if (!user?.id) return false

      // Définir showToast à l'intérieur du callback
      const showToast = (message, type) => console.log(`[${type}] ${message}`)

      try {
        const { data, error } = await supabase.functions.invoke(
          'change-account-status',
          {
            body: {
              target_user_id: user.id,
              new_status: newStatus,
              reason: reason,
            },
          }
        )

        if (error) {
          console.error('Erreur changement état compte:', error)
          showToast(`Erreur : ${error.message}`, 'error')
          return false
        }

        if (data?.success) {
          showToast('État du compte mis à jour', 'success')
          await fetchAccountStatus() // Rafraîchir l'état
          return true
        }

        return false
      } catch (err) {
        console.error('Erreur changement état compte:', err)
        showToast('Erreur lors de la mise à jour', 'error')
        return false
      }
    },
    [user?.id, fetchAccountStatus]
  )

  // Fonction pour annuler la suppression programmée
  const cancelDeletion = useCallback(async () => {
    if (!isScheduledForDeletion) return false
    return await changeAccountStatus(
      'active',
      "Suppression annulée par l'utilisateur"
    )
  }, [isScheduledForDeletion, changeAccountStatus])

  // Fonction pour programmer la suppression
  const scheduleDeletion = useCallback(async () => {
    return await changeAccountStatus(
      'deletion_scheduled',
      "Suppression programmée par l'utilisateur"
    )
  }, [changeAccountStatus])

  // Affichage de l'état
  const getStatusDisplay = useCallback(status => {
    switch (status) {
      case 'active':
        return {
          label: 'Actif',
          color: 'success',
          icon: '✅',
          description: 'Votre compte est actif et fonctionnel',
        }
      case 'suspended':
        return {
          label: 'Suspendu',
          color: 'error',
          icon: '⛔',
          description: 'Votre compte a été suspendu. Contactez le support.',
        }
      case 'deletion_scheduled':
        return {
          label: 'Suppression programmée',
          color: 'warning',
          icon: '🗑️',
          description: 'Votre compte sera supprimé prochainement',
        }
      case 'pending_verification':
        return {
          label: 'En attente de vérification',
          color: 'info',
          icon: '⏳',
          description: 'Vérifiez votre email pour activer votre compte',
        }
      default:
        return {
          label: 'Inconnu',
          color: 'default',
          icon: '❓',
          description: 'État du compte non reconnu',
        }
    }
  }, [])

  const statusDisplay = useMemo(
    () => getStatusDisplay(accountStatus),
    [getStatusDisplay, accountStatus]
  )

  // Vérifier si l'utilisateur peut utiliser l'application
  const canUseApp = useMemo(() => {
    return (
      accountStatus === 'active' || accountStatus === 'pending_verification'
    )
  }, [accountStatus])

  // Vérifier si l'utilisateur peut créer du contenu
  const canCreateContent = useMemo(() => {
    return accountStatus === 'active'
  }, [accountStatus])

  return {
    // État
    accountStatus,
    loading,
    isSuspended,
    isPendingVerification,
    isScheduledForDeletion,
    deletionDate,

    // Affichage
    statusDisplay,
    canUseApp,
    canCreateContent,

    // Actions
    changeAccountStatus,
    cancelDeletion,
    scheduleDeletion,
    refresh: fetchAccountStatus,
  }
}
