import { saveUserTimezoneOnce } from '@/services/saveUserTimezone'
import { supabase } from '@/utils'
import PropTypes from 'prop-types'
import { createContext, useEffect, useMemo, useState } from 'react'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let mounted = true
    const timerId = `authReady-${Date.now()}-${Math.random()}`
    console.time(timerId)

    // ✅ DÉBLOQUER L'UI IMMÉDIATEMENT
    setAuthReady(true)
    console.timeEnd(timerId)
    ;(async () => {
      try {
        console.log('🔐 Récupération de la session au démarrage...')
        const { data, error } = await supabase.auth.getSession()
        if (!mounted) return

        if (error) {
          console.warn('Session: erreur getSession()', error)
        }

        const u = data?.session?.user ?? null
        setUser(u)

        // Test de session non-bloquant (optionnel)
        if (u) {
          supabase
            .rpc('get_usage_fast', { p_user_id: u.id })
            .then(({ error: testError }) => {
              if (testError)
                console.warn('Test session (non-bloquant):', testError)
            })
            .catch(e => console.warn('Test session (non-bloquant):', e))
        }
      } catch (e) {
        if (!mounted) return
        console.error('getSession() a échoué:', e)
        setUser(null)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null
        console.log(
          "🔐 Changement d'état auth:",
          event,
          u?.id || 'aucun utilisateur'
        )
        setUser(u)
        if (u && event === 'SIGNED_IN') {
          await saveUserTimezoneOnce()
        }
      }
    )

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const signOut = async () => {
    try {
      console.log('🔐 Début de la déconnexion...')

      // Timeout de 5 secondes pour éviter le blocage
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout déconnexion')), 5000)
      )

      const signOutPromise = supabase.auth.signOut({ scope: 'global' })

      const { error } = await Promise.race([signOutPromise, timeoutPromise])

      if (error) {
        console.error('Erreur déconnexion Supabase:', error)
      }

      // Toujours forcer la déconnexion locale
      setUser(null)
      setAuthReady(false)
      console.log('🔐 Déconnexion terminée')
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err)
      // Même en cas d'erreur, forcer la déconnexion locale
      setUser(null)
      setAuthReady(false)
      console.log('🔐 Déconnexion forcée (timeout/erreur)')
    }
  }

  const value = useMemo(() => ({ user, authReady, signOut }), [user, authReady])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
