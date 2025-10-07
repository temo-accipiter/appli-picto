// src/contexts/AuthContext.jsx
// Auth global robuste : annonce toujours authReady (succès ou échec),
// et met à jour user depuis la session courante + onAuthStateChange.

import PropTypes from 'prop-types'
import { createContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    let timeoutId

    const markReady = () => mounted && setAuthReady(true)

    const init = async () => {
      setError(null)

      try {
        // 1) Lecture synchronisée de la session (plus fiable que getUser au tout début)
        const { data: sessionData, error: sErr } =
          await supabase.auth.getSession()
        if (sErr && import.meta.env.DEV)
          console.warn('[Auth] getSession error:', sErr)

        const sessionUser = sessionData?.session?.user ?? null
        if (mounted) setUser(sessionUser)

        // 2) Même si la session n’est pas encore restaurée, on ne doit PAS bloquer l’app.
        //    On met un garde-fou: authReady TRUE après un court délai quoi qu’il arrive.
        timeoutId = window.setTimeout(markReady, 800)

        // 3) Si la session est déjà là, on peut lever le ready tout de suite.
        if (sessionUser) {
          window.clearTimeout(timeoutId)
          markReady()
        }

        // 4) Abonnement aux changements (login/logout/refresh)
        const { data: sub } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (!mounted) return
            setUser(session?.user ?? null)
            // La première fois qu’on reçoit un event, on force ready
            window.clearTimeout(timeoutId)
            markReady()
          }
        )

        return () => {
          sub?.subscription?.unsubscribe?.()
        }
      } catch (e) {
        if (import.meta.env.DEV)
          console.warn('[Auth] unexpected init error:', e)
        setError(e)
        // Ne jamais bloquer : on annonce ready même en erreur
        markReady()
      }
    }

    init()

    return () => {
      mounted = false
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Auth] signOut error:', e)
      setError(e)
    } finally {
      setUser(null)
      setAuthReady(true)
    }
  }

  const value = useMemo(
    () => ({ user, authReady, error, signOut }),
    [user, authReady, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired }

export default AuthProvider
