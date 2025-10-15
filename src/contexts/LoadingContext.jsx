// src/contexts/LoadingContext.jsx
// Contexte de chargement global pour gérer l'état de chargement de l'application
// - setLoading(true/false) pour afficher/masquer le loader
// - setLoadingMessage(string) pour personnaliser le message

import { createContext, useContext, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import GlobalLoader from '@/components/shared/global-loader/GlobalLoader'

// ✅ Export nommé pour permettre le ré-export dans contexts/index.js
export const LoadingContext = createContext(null)

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')

  // Fonction pour démarrer le chargement avec un message optionnel
  const startLoading = useCallback((message = 'Chargement...') => {
    setLoadingMessage(message)
    setIsLoading(true)
  }, [])

  // Fonction pour arrêter le chargement
  const stopLoading = useCallback(() => {
    setIsLoading(false)
    setLoadingMessage('')
  }, [])

  // Fonction simplifiée pour activer/désactiver le chargement
  const setLoading = useCallback(
    (loading, message = 'Chargement...') => {
      if (loading) {
        startLoading(message)
      } else {
        stopLoading()
      }
    },
    [startLoading, stopLoading]
  )

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        setLoading,
        startLoading,
        stopLoading,
        setLoadingMessage,
      }}
    >
      {children}
      {isLoading && <GlobalLoader message={loadingMessage} />}
    </LoadingContext.Provider>
  )
}

LoadingProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading doit être utilisé dans un LoadingProvider')
  }
  return context
}

export default LoadingProvider
