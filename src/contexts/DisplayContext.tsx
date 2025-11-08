// src/contexts/DisplayContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { usePermissions } from './PermissionsContext'

interface DisplayContextValue {
  showTrain: boolean
  setShowTrain: (value: boolean) => void
  showAutre: boolean
  setShowAutre: (value: boolean) => void
  showRecompense: boolean
  setShowRecompense: (value: boolean) => void
  showTimeTimer: boolean
  setShowTimeTimer: (value: boolean) => void
  loading: boolean
  isVisitor: boolean
}

interface DisplayProviderProps {
  children: React.ReactNode
}

// ✅ on exporte maintenant le contexte nommément
export const DisplayContext = createContext<DisplayContextValue | null>(null)

export function DisplayProvider({ children }: DisplayProviderProps) {
  // Dans notre PermissionsContext refondu, on a `ready` au lieu de `loading`
  const { isVisitor, ready } = usePermissions()
  const loading = !ready // alias pour compat avec l'ancienne logique

  const [showTrain, setShowTrain] = useState(() =>
    isVisitor ? true : localStorage.getItem('showTrain') === 'true'
  )
  useEffect(() => {
    if (!loading && isVisitor && !showTrain) setShowTrain(true)
  }, [isVisitor, loading, showTrain])
  useEffect(() => {
    if (!isVisitor) {
      localStorage.setItem('showTrain', showTrain ? 'true' : 'false')
    }
  }, [showTrain, isVisitor])

  const [showAutre, setShowAutre] = useState(() => {
    if (loading) return localStorage.getItem('showAutre') === 'true'
    return isVisitor ? false : localStorage.getItem('showAutre') === 'true'
  })
  useEffect(() => {
    if (!isVisitor)
      localStorage.setItem('showAutre', showAutre ? 'true' : 'false')
  }, [showAutre, isVisitor])

  const [showRecompense, setShowRecompense] = useState(() => {
    if (loading) {
      const v = localStorage.getItem('showRecompense')
      return v === null ? true : v === 'true'
    }
    return isVisitor ? true : localStorage.getItem('showRecompense') === 'true'
  })
  useEffect(() => {
    if (!isVisitor)
      localStorage.setItem('showRecompense', showRecompense ? 'true' : 'false')
  }, [showRecompense, isVisitor])

  const [showTimeTimer, setShowTimeTimer] = useState(() => {
    if (loading) return localStorage.getItem('showTimeTimer') === 'true'
    return isVisitor ? false : localStorage.getItem('showTimeTimer') === 'true'
  })
  useEffect(() => {
    if (!isVisitor)
      localStorage.setItem('showTimeTimer', showTimeTimer ? 'true' : 'false')
  }, [showTimeTimer, isVisitor])

  return (
    <DisplayContext.Provider
      value={{
        showTrain,
        setShowTrain,
        showAutre,
        setShowAutre,
        showRecompense,
        setShowRecompense,
        showTimeTimer,
        setShowTimeTimer,
        loading, // expose l'alias si d'autres consommateurs l'utilisent
        isVisitor, // utile à l'UI
      }}
    >
      {children}
    </DisplayContext.Provider>
  )
}

export function useDisplay(): DisplayContextValue {
  const context = useContext(DisplayContext)
  if (!context) {
    throw new Error('useDisplay must be used within a DisplayProvider')
  }
  return context
}

// ✅ Export par défaut homogène
export default DisplayProvider
