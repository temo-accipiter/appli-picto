/*
// src/contexts/AuthContext.jsx
// Auth global robuste : annonce toujours authReady (succès ou échec),
// et met à jour user depuis la session courante + onAuthStateChange.

import PropTypes from 'prop-types'
import { createContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import {
  checkSupabaseHealth,
  resetSupabaseClient,
} from '@/utils/supabaseHealthCheck'
import {
  startSupabaseHeartbeat,
  stopSupabaseHeartbeat,
} from '@/utils/supabaseHeartbeat'
import {
  startVisibilityHandler,
  stopVisibilityHandler,
} from '@/utils/supabaseVisibilityHandler'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    let timeoutId

    // ✅ Toast simple pour informer avant reload
    const showReconnectionToast = () => {
      // Créer un toast simple sans dépendance ToastContext
      const toast = document.createElement('div')
      toast.textContent = 'ℹ️ Connexion interrompue – reconnexion automatique...'
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4a90e2;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `
      document.body.appendChild(toast)
    }

    // ⚠️ HEARTBEAT DÉSACTIVÉ : Cause trop de faux positifs après changement d'onglet
    // Le vrai bug (channels zombies avec Date.now()) a été corrigé dans useRBAC.js
    // Le health check détecte des timeouts normaux dus au throttling réseau du navigateur
    //
    // startSupabaseHeartbeat(supabase, {
    //   showToast: showReconnectionToast,
    // })

    // ✅ CORRECTIF CRITIQUE : Gérer la reconnexion au retour de visibilité
    // Quand l'utilisateur change d'onglet, les Realtime channels se déconnectent
    // et ne se reconnectent PAS automatiquement au retour
    startVisibilityHandler(supabase)

    // ✅ CORRECTIF SDK DEADLOCK : Écouter la recréation du client
    // Quand le SDK entre en deadlock (après suspension d'onglet), le visibility handler
    // recrée le client et dispatch un événement custom pour rafraîchir les contextes
    const handleClientRecreation = async (event) => {
      if (!mounted) return

      const { session } = event.detail
      if (import.meta.env.DEV) {
        console.log('[Auth] 🔄 Supabase client was recreated, updating auth state...')
      }

      // Mettre à jour l'utilisateur avec la session restaurée
      setUser(session?.user ?? null)

      // Rafraîchir les listeners
      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (!mounted) return
          setUser(newSession?.user ?? null)
        }
      )

      if (import.meta.env.DEV) {
        console.log('[Auth] ✅ Auth state refreshed after client recreation')
      }

      return () => {
        sub?.subscription?.unsubscribe?.()
      }
    }

    window.addEventListener('supabase-client-recreated', handleClientRecreation)

    const markReady = () => mounted && setAuthReady(true)

    const init = async () => {
      setError(null)

      try {
        // ⚠️ DÉSACTIVÉ : Health check au boot trop agressif, laissons le heartbeat gérer
        // Le heartbeat vérifiera après 30s, ce qui laisse le temps au SDK de se stabiliser

        // 1) Lecture synchronisée de la session avec TIMEOUT pour éviter le blocage
        // Si getSession() ne répond pas en 5s (connexion morte), on continue quand même
        let sessionData = null
        let sErr = null

        try {
          const result = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('getSession timeout')), 5000)
            )
          ])
          sessionData = result.data
          sErr = result.error
        } catch (timeoutError) {
          if (import.meta.env.DEV) {
            console.warn('[Auth] getSession timeout, continuing anyway...', timeoutError)
          }
          // Continuer avec sessionData = null, authReady sera true quand même
        }

        if (sErr && import.meta.env.DEV)
          console.warn('[Auth] getSession error:', sErr)

        let sessionUser = sessionData?.session?.user ?? null

        // ⚠️ REFRESH DÉSACTIVÉ : Bloque l'application après changement d'onglet
        // Le SDK Supabase gère automatiquement le refresh des tokens expirés
        // Forcer le refresh au boot cause des timeouts avec le throttling réseau du navigateur
        //
        // if (sessionData?.session && mounted) {
        //   try {
        //     const { data: refreshData, error: refreshErr } =
        //       await supabase.auth.refreshSession()
        //     if (refreshErr) {
        //       if (import.meta.env.DEV)
        //         console.warn('[Auth] refreshSession error:', refreshErr)
        //     } else if (refreshData?.session) {
        //       sessionUser = refreshData.session.user
        //     }
        //   } catch (refreshError) {
        //     if (import.meta.env.DEV)
        //       console.warn('[Auth] refreshSession exception:', refreshError)
        //   }
        // }

        if (mounted) setUser(sessionUser)

        // 2) Garde-fou : authReady TRUE après un délai (plus long pour tenir compte du refresh)
        //    ✅ CORRECTIF : Augmenté à 2000ms pour laisser le temps au refresh de se terminer
        timeoutId = window.setTimeout(markReady, 2000)

        // 3) Si la session est déjà là (et rafraîchie), on peut lever le ready tout de suite.
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
      // ✅ Arrêter le visibility handler au démontage
      // stopSupabaseHeartbeat() // Déjà désactivé ci-dessus
      stopVisibilityHandler()
      window.removeEventListener('supabase-client-recreated', handleClientRecreation)
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
    () => ({
      user,
      authReady,
      loading: !authReady, // ✅ Ajout de loading pour compatibilité
      error,
      signOut,
    }),
    [user, authReady, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired }

export default AuthProvider
*/
// src/contexts/AuthContext.jsx
// Auth global robuste : annonce toujours authReady (succès ou échec),
// et met à jour user depuis la session courante + onAuthStateChange.

import PropTypes from 'prop-types'
import { createContext, useEffect, useMemo, useState } from 'react'
import { supabase, recreateSupabaseClient } from '@/utils/supabaseClient'
import {
  startVisibilityHandler,
  stopVisibilityHandler,
} from '@/utils/supabaseVisibilityHandler'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    let timeoutId

    // ✅ CORRECTIF CRITIQUE : Gérer la reconnexion au retour de visibilité
    // Quand l'utilisateur change d'onglet, les Realtime channels se déconnectent
    // et ne se reconnectent PAS automatiquement au retour
    startVisibilityHandler(supabase)

    // ✅ CORRECTIF SDK DEADLOCK : Écouter la recréation du client
    // Quand le SDK entre en deadlock (après suspension d'onglet), le visibility handler
    // recrée le client et dispatch un événement custom pour rafraîchir les contextes
    const handleClientRecreation = async event => {
      if (!mounted) return

      const { session } = event.detail
      if (import.meta.env.DEV) {
        console.log(
          '[Auth] 🔄 Supabase client was recreated, updating auth state...'
        )
      }

      // Mettre à jour l'utilisateur avec la session restaurée
      setUser(session?.user ?? null)

      // Rafraîchir les listeners
      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (!mounted) return
          setUser(newSession?.user ?? null)
        }
      )

      if (import.meta.env.DEV) {
        console.log('[Auth] ✅ Auth state refreshed after client recreation')
      }

      return () => {
        sub?.subscription?.unsubscribe?.()
      }
    }

    window.addEventListener('supabase-client-recreated', handleClientRecreation)

    const markReady = () => mounted && setAuthReady(true)

    const init = async () => {
      setError(null)

      try {
        // 1) Lecture synchronisée de la session avec TIMEOUT pour éviter le blocage
        // Si getSession() ne répond pas en 5s (connexion morte), on continue quand même
        let sessionData = null
        let sErr = null

        try {
          const result = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('getSession timeout')), 5000)
            ),
          ])
          sessionData = result.data
          sErr = result.error
        } catch (timeoutError) {
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
      setError(e)
    } finally {
      setUser(null)
      setAuthReady(true)
    }
  }

  const value = useMemo(
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

AuthProvider.propTypes = { children: PropTypes.node.isRequired }

export default AuthProvider
