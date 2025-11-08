// src/contexts/AuthContext.tsx
// Auth global robuste : annonce toujours authReady (succès ou échec),
// et met à jour user depuis la session courante + onAuthStateChange.

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { AuthContextValue } from '@/types/contexts'
import { supabase, recreateSupabaseClient } from '@/utils/supabaseClient'
import {
  startVisibilityHandler,
  stopVisibilityHandler,
} from '@/utils/supabaseVisibilityHandler'

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

interface ClientRecreatedEventDetail {
  session: Session | null
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true
    let timeoutId: number | undefined
    let authSubscription: { subscription: { unsubscribe: () => void } } | null =
      null

    // ✅ CORRECTIF CRITIQUE : Gérer la reconnexion au retour de visibilité
    // Quand l'utilisateur change d'onglet, les Realtime channels se déconnectent
    // et ne se reconnectent PAS automatiquement au retour
    startVisibilityHandler(supabase)

    // ✅ CORRECTIF SDK DEADLOCK : Écouter la recréation du client
    // Quand le SDK entre en deadlock (après suspension d'onglet), le visibility handler
    // recrée le client et dispatch un événement custom pour rafraîchir les contextes
    const handleClientRecreation = async (event: Event): Promise<void> => {
      if (!mounted) return

      const customEvent = event as CustomEvent<ClientRecreatedEventDetail>
      const { session } = customEvent.detail
      if (import.meta.env.DEV) {
        console.log(
          '[Auth] 🔄 Supabase client was recreated, updating auth state...'
        )
      }

      // Mettre à jour l'utilisateur avec la session restaurée
      setUser(session?.user ?? null)

      // Rafraîchir les listeners
      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!mounted) return
        setUser(newSession?.user ?? null)
      })

      if (import.meta.env.DEV) {
        console.log('[Auth] ✅ Auth state refreshed after client recreation')
      }
    }

    window.addEventListener('supabase-client-recreated', handleClientRecreation)

    const markReady = () => mounted && setAuthReady(true)

    const init = async () => {
      setError(null)

      try {
        // 1) Lecture synchronisée de la session avec TIMEOUT pour éviter le blocage
        // Si getSession() ne répond pas en 5s (connexion morte), on continue quand même
        let sessionData: { session: Session | null } | null = null
        let sErr: AuthError | null = null

        try {
          const result = await Promise.race([
            supabase.auth.getSession(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('getSession timeout')), 5000)
            ),
          ])
          sessionData = result.data
          sErr = result.error
        } catch {
          if (import.meta.env.DEV) {
            console.warn('[Auth] getSession timeout, recreating SDK client...')
          }

          // 🔑 CORRECTIF CRITIQUE : Recréer le client SDK sur timeout
          try {
            const { session: restoredSession } = await recreateSupabaseClient()
            sessionData = restoredSession ? { session: restoredSession } : null

            if (import.meta.env.DEV) {
              console.log('[Auth] ✅ SDK client recreated after timeout')
            }
          } catch (recreateError) {
            console.error(
              '[Auth] Failed to recreate SDK client:',
              recreateError
            )
            // Continuer avec sessionData = null
          }
        }

        if (sErr && import.meta.env.DEV)
          console.warn('[Auth] getSession error:', sErr)

        let sessionUser = sessionData?.session?.user ?? null

        if (mounted) setUser(sessionUser)

        // 2) Garde-fou : authReady TRUE après un délai
        timeoutId = window.setTimeout(markReady, 2000)

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
            // La première fois qu'on reçoit un event, on force ready
            window.clearTimeout(timeoutId)
            markReady()
          }
        )

        authSubscription = sub
      } catch (e) {
        if (import.meta.env.DEV)
          console.warn('[Auth] unexpected init error:', e)
        setError(e as Error)
        // Ne jamais bloquer : on annonce ready même en erreur
        markReady()
      }
    }

    init()

    return () => {
      mounted = false
      if (timeoutId) window.clearTimeout(timeoutId)
      if (authSubscription) {
        authSubscription.subscription?.unsubscribe?.()
      }
      stopVisibilityHandler()
      window.removeEventListener(
        'supabase-client-recreated',
        handleClientRecreation
      )
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Auth] signOut error:', e)
      setError(e as Error)
    } finally {
      setUser(null)
      setAuthReady(true)
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authReady,
      loading: !authReady,
      error,
      signOut,
    }),
    [user, authReady, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
