import { AuthContext } from '@/contexts/AuthContext'
import { isAbortLike, withAbortSafe } from '@/hooks'
import { supabase } from '@/utils'
import { useContext, useEffect, useState } from 'react'

// Log "safe" pour Safari/Firefox
const formatErr = (e) => {
  const m = String(e?.message ?? e)
  const parts = [
    m,
    e?.code ? `[${e.code}]` : '',
    e?.details ? `— ${e.details}` : '',
    e?.hint ? `(hint: ${e.hint})` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

/**
 * Hook pour gérer les droits et permissions de l'utilisateur
 * Utilise le nouveau système de permissions basé sur user_roles
 */
export const useEntitlements = () => {
  const { user } = useContext(AuthContext)
  const [role, setRole] = useState('visitor')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const determineRole = async () => {
      if (!user?.id) {
        if (!mounted) return
        setRole('visitor')
        setSubscription(null)
        setLoading(false)
        return
      }

      setLoading(true)

      // 1) NOUVEAU SYSTÈME : rôles via user_roles -> roles (avec priorité)
      const { data: userRoles, error: userRolesError, aborted: rolesAborted } =
        await withAbortSafe(
          supabase
            .from('user_roles')
            .select(`
              role_id,
              is_active,
              roles (
                name,
                display_name,
                priority
              )
            `)
            .eq('user_id', user.id)
            .eq('is_active', true) // Seulement les rôles actifs
        )

      if (!mounted) return
      if (rolesAborted || (userRolesError && isAbortLike(userRolesError))) {
        setLoading(false)
        return
      }
      if (userRolesError) {
        console.debug(
          'useEntitlements: récupération des rôles transitoirement échouée',
          userRolesError
        )
      }

      if (Array.isArray(userRoles) && userRoles.length > 0) {
        console.log('🔍 useEntitlements: rôles trouvés:', userRoles)
        
        // Trier par priorité décroissante côté client
        const sortedUserRoles = [...userRoles].sort((a, b) => {
          const priorityA = a.roles?.priority ?? 0
          const priorityB = b.roles?.priority ?? 0
          return priorityB - priorityA
        })

        console.log('🔍 useEntitlements: rôles triés:', sortedUserRoles)

        // Prendre le rôle avec la priorité la plus haute
        const highest = sortedUserRoles[0]
        if (highest?.roles?.name) {
          console.log('🔍 useEntitlements: rôle sélectionné:', highest.roles.name)
          setRole(highest.roles.name)
          setLoading(false)
          return
        }
      } else {
        console.log('🔍 useEntitlements: aucun rôle trouvé, userRoles:', userRoles)
      }

      // 2) FALLBACK : abonnement actif (active/trialing) le plus récent
      const {
        data: abonnement,
        error: aboError,
        aborted: aboAborted,
      } = await withAbortSafe(
        supabase
          .from('abonnements')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      )

      if (!mounted) return
      if (aboAborted || (aboError && isAbortLike(aboError))) {
        setLoading(false)
        return
      }
      if (aboError) {
        console.debug(
          `useEntitlements: fallback abonnement transitoirement échoué: ${formatErr(aboError)}`
        )
        setRole('visitor')
        setSubscription(null)
        setLoading(false)
        return
      }

      if (abonnement) {
        setSubscription(abonnement)
        setRole('abonne')
      } else {
        setSubscription(null)
        setRole('visitor')
      }
      setLoading(false)
    }

    determineRole()

    return () => {
      mounted = false
    }
  }, [user])

  // Vérifier si l'abonnement est en période d’essai
  const isTrialPeriod = subscription?.status === 'trialing'

  // Vérifier si l'abonnement est actif
  const isActiveSubscription =
    subscription?.status === 'active' || isTrialPeriod

  // Vérifier si l'abonnement expire bientôt
  const isExpiringSoon =
    subscription?.current_period_end &&
    new Date(subscription.current_period_end) <
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return {
    role,
    subscription,
    loading,
    isTrialPeriod,
    isActiveSubscription,
    isExpiringSoon,
    isVisitor: role === 'visitor',
    isSubscriber: role === 'abonne',
    isAdmin: role === 'admin',
    isFree: role === 'free',
    isStaff: role === 'staff',
    userId: user?.id,
  }
}
