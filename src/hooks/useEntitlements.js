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

    const determineRole = async (retryCount = 0) => {
      const maxRetries = 3
      // Attendre un petit délai pour éviter les conditions de course
      await new Promise(resolve => setTimeout(resolve, 100 + (retryCount * 200)))
      console.log('🔍 useEntitlements: determineRole appelé avec user:', user?.id, retryCount > 0 ? `(tentative ${retryCount + 1}/${maxRetries + 1})` : '')
      
      if (!user?.id) {
        if (!mounted) return
        console.log('🔍 useEntitlements: pas d\'utilisateur, rôle = visitor')
        setRole('visitor')
        setSubscription(null)
        setLoading(false)
        return
      }

      setLoading(true)
      console.log('🔍 useEntitlements: début de la détermination du rôle pour user:', user.id)

      // Utiliser get_usage_fast qui est plus fiable et existe déjà
      // Note: Cette fonction nécessite une authentification (assert_self_or_admin)
      const { data: usageData, error: usageError, aborted: usageAborted } =
        await withAbortSafe(
          supabase.rpc('get_usage_fast', { p_user_id: user.id })
        )

      if (!mounted) return
      if (usageAborted || (usageError && isAbortLike(usageError))) {
        console.log('🔍 useEntitlements: requête usage annulée ou aborted')
        setLoading(false)
        return
      }
      
      if (usageError) {
        console.error('🔍 useEntitlements: erreur récupération usage/rôle:', usageError)
        console.debug(
          'useEntitlements: récupération du rôle transitoirement échouée',
          usageError
        )
        // Fallback vers abonnement en cas d'erreur
      } else if (usageData?.role?.name && usageData.role.name !== 'undefined') {
        console.log('🔍 useEntitlements: rôle trouvé via get_usage_fast:', usageData.role.name)
        console.log('🔍 useEntitlements: données complètes usageData:', JSON.stringify(usageData, null, 2))
        setRole(usageData.role.name)
        setLoading(false)
        return
      } else {
        console.warn('🔍 useEntitlements: aucun rôle trouvé dans usageData:', JSON.stringify(usageData, null, 2))
        console.warn('🔍 useEntitlements: usageData.role:', usageData?.role)
        console.warn('🔍 useEntitlements: usageData.role.name:', usageData?.role?.name)
        
        // Retry logic si pas de rôle trouvé et qu'on a des tentatives restantes
        if (retryCount < maxRetries && usageData?.role?.name === undefined) {
          console.log('🔍 useEntitlements: retry dans 500ms...')
          setTimeout(() => {
            if (mounted) determineRole(retryCount + 1)
          }, 500)
          return
        }
        
        // Ajouter un délai avant le fallback pour éviter les conditions de course
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // FALLBACK : abonnement actif (active/trialing) le plus récent
      console.log('🔍 useEntitlements: passage au fallback abonnement...')
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
        console.log('🔍 useEntitlements: abonnement trouvé, rôle = abonné')
        setSubscription(abonnement)
        setRole('abonne')
      } else {
        console.warn('🔍 useEntitlements: aucun abonnement trouvé, rôle = visitor')
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
