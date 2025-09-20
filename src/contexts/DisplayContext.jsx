import PropTypes from 'prop-types'
import { createContext, useContext, useEffect, useState } from 'react'
import { usePermissions } from './PermissionsContext'

const DisplayContext = createContext()

export function DisplayProvider({ children }) {
  const { isVisitor, loading } = usePermissions()

  // ✅ Train - Valeurs par défaut pour les visiteurs
  const [showTrain, setShowTrain] = useState(() => {
    if (isVisitor) return true // Par défaut activé pour les visiteurs
    return localStorage.getItem('showTrain') === 'true'
  })

  // Mettre à jour showTrain quand isVisitor change
  useEffect(() => {
    if (!loading && isVisitor && !showTrain) {
      setShowTrain(true) // Forcer true pour les visiteurs
    }
  }, [isVisitor, loading, showTrain])

  useEffect(() => {
    if (!isVisitor) {
      localStorage.setItem('showTrain', showTrain ? 'true' : 'false')
    }
  }, [showTrain, isVisitor])

  // ✅ Autre (réservé pour plus tard)
  const [showAutre, setShowAutre] = useState(() => {
    // Pendant le chargement, utiliser localStorage ou false par défaut
    if (loading) {
      return localStorage.getItem('showAutre') === 'true'
    }
    if (isVisitor) return false // Par défaut désactivé pour les visiteurs
    return localStorage.getItem('showAutre') === 'true'
  })

  useEffect(() => {
    if (!isVisitor) {
      localStorage.setItem('showAutre', showAutre ? 'true' : 'false')
    }
  }, [showAutre, isVisitor])

  // ✅ Récompense - Valeurs par défaut pour les visiteurs
  const [showRecompense, setShowRecompense] = useState(() => {
    // Pendant le chargement, utiliser localStorage ou true par défaut
    if (loading) {
      return localStorage.getItem('showRecompense') === 'true' || localStorage.getItem('showRecompense') === null
    }
    if (isVisitor) return true // Par défaut activé pour les visiteurs
    return localStorage.getItem('showRecompense') === 'true'
  })

  useEffect(() => {
    if (!isVisitor) {
      localStorage.setItem('showRecompense', showRecompense ? 'true' : 'false')
    }
  }, [showRecompense, isVisitor])

  return (
    <DisplayContext.Provider
      value={{
        showTrain,
        setShowTrain,
        showAutre,
        setShowAutre,
        showRecompense,
        setShowRecompense,
      }}
    >
      {children}
    </DisplayContext.Provider>
  )
}

DisplayProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export function useDisplay() {
  return useContext(DisplayContext)
}
