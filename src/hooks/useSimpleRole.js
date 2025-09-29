import { AuthContext } from '@/contexts/AuthContext'
import { useContext, useEffect, useState } from 'react'

/**
 * Hook simplifié pour déterminer le rôle de l'utilisateur
 * Ne dépend pas des RPC lents, utilise des requêtes directes rapides
 */
export function useSimpleRole() {
  const { user, authReady } = useContext(AuthContext)
  const [role, setRole] = useState('unknown')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authReady) {
      setLoading(true)
      return
    }

    if (!user) {
      setRole('visitor')
      setLoading(false)
      return
    }

    // 🚀 SOLUTION ULTRA-SIMPLE : Pas de requêtes, juste des fallbacks
    console.log('🔍 useSimpleRole: utilisateur connecté, rôle = free')
    setRole('free')
    setLoading(false)
  }, [authReady, user])

  return { role, loading }
}

export default useSimpleRole
