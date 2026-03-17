'use client'

// src/contexts/DisplayContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useIsVisitor } from '@/hooks'

interface DisplayContextValue {
  showTrain: boolean
  setShowTrain: (value: boolean) => void
  showAutre: boolean
  setShowAutre: (value: boolean) => void
  showTimeTimer: boolean
  setShowTimeTimer: (value: boolean) => void
  loading: boolean
  isVisitor: boolean
}

interface DisplayProviderProps {
  children: ReactNode
}

// ✅ on exporte maintenant le contexte nommément
export const DisplayContext = createContext<DisplayContextValue | null>(null)

export function DisplayProvider({ children }: DisplayProviderProps) {
  const { isVisitor, authReady } = useIsVisitor()
  const loading = !authReady // alias pour compat avec l'ancienne logique

  const [showTrain, setShowTrain] = useState(() => {
    if (typeof window === 'undefined') return true
    return isVisitor ? true : localStorage.getItem('showTrain') === 'true'
  })
  useEffect(() => {
    if (!loading && isVisitor && !showTrain) setShowTrain(true)
  }, [isVisitor, loading, showTrain])
  useEffect(() => {
    if (typeof window !== 'undefined' && !isVisitor) {
      localStorage.setItem('showTrain', showTrain ? 'true' : 'false')
    }
  }, [showTrain, isVisitor])

  const [showAutre, setShowAutre] = useState(() => {
    if (typeof window === 'undefined') return false
    if (loading) return localStorage.getItem('showAutre') === 'true'
    return isVisitor ? false : localStorage.getItem('showAutre') === 'true'
  })
  useEffect(() => {
    if (typeof window !== 'undefined' && !isVisitor)
      localStorage.setItem('showAutre', showAutre ? 'true' : 'false')
  }, [showAutre, isVisitor])

  const [showTimeTimer, setShowTimeTimer] = useState(() => {
    if (typeof window === 'undefined') return false
    if (loading) return localStorage.getItem('showTimeTimer') === 'true'
    return isVisitor ? false : localStorage.getItem('showTimeTimer') === 'true'
  })
  useEffect(() => {
    if (typeof window !== 'undefined' && !isVisitor)
      localStorage.setItem('showTimeTimer', showTimeTimer ? 'true' : 'false')
  }, [showTimeTimer, isVisitor])

  return (
    <DisplayContext.Provider
      value={{
        showTrain,
        setShowTrain,
        showAutre,
        setShowAutre,
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
