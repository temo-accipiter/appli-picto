import { saveUserTimezoneOnce } from '@/services/saveUserTimezone'
import { supabase } from '@/utils'
import PropTypes from 'prop-types'
import { createContext, useEffect, useState } from 'react'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      try {
        console.log('🔐 Récupération de la session au démarrage...')
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Erreur session Supabase:', error)
          // En cas d'erreur, on force une déconnexion propre
          await supabase.auth.signOut({ scope: 'global' })
          setUser(null)
          setLoading(false)
          return
        }

        const user = data?.session?.user ?? null
        console.log('🔐 Session récupérée:', user ? `utilisateur ${user.id}` : 'aucun utilisateur')
        
        // Vérifier si la session est valide en testant une requête simple
        if (user) {
          try {
            const { error: testError } = await supabase.rpc('get_usage_fast', { p_user_id: user.id })
            if (testError) {
              console.warn('🔐 Session semble invalide, déconnexion forcée:', testError)
              await supabase.auth.signOut({ scope: 'global' })
              setUser(null)
              setLoading(false)
              return
            }
          } catch (testErr) {
            console.warn('🔐 Erreur test session, déconnexion forcée:', testErr)
            await supabase.auth.signOut({ scope: 'global' })
            setUser(null)
            setLoading(false)
            return
          }
        }

        setUser(user)
        setLoading(false)
      } catch (err) {
        console.error('🔐 Erreur critique lors de la récupération de session:', err)
        setUser(null)
        setLoading(false)
      }
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Changement d\'état auth:', event, session?.user?.id || 'aucun utilisateur')
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        // Sauvegarder le timezone de l'utilisateur quand il se connecte
        if (currentUser && event === 'SIGNED_IN') {
          await saveUserTimezoneOnce()
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      console.log('🔐 Début de la déconnexion...')
      
      // Force la déconnexion avec scope 'global' pour s'assurer que tous les onglets sont déconnectés
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      
      if (error) {
        console.error('Erreur déconnexion Supabase:', error)
        // Même en cas d'erreur, on force la déconnexion locale
      }
      
      // Force la mise à jour de l'état local
      setUser(null)
      console.log('🔐 Déconnexion terminée')
      
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err)
      // En cas d'erreur complète, on force quand même la déconnexion locale
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
