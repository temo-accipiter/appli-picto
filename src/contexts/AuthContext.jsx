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
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error('Erreur session Supabase:', error)
      setUser(data?.session?.user ?? null)
      setLoading(false)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        // Sauvegarder le timezone de l'utilisateur quand il se connecte
        if (currentUser) {
          await saveUserTimezoneOnce()
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Erreur déconnexion :', error)
    setUser(null)
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
