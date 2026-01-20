'use client'

// src/contexts/ToastContext.tsx
// Contexte de toasts : même comportement par défaut (2000ms) + options facultatives.
// - show(message, type = 'info', options?: { duration?: number })
// - hide() pour fermer manuellement
// - Respect du paramètre global toasts_enabled
// Aucune modification du composant <Toast /> ni de ses props.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import Toast from '@/components/ui/toast/Toast'
import { useParametres } from '@/hooks'

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastState {
  visible: boolean
  message: string
  type: ToastType
}

interface ToastContextValue {
  show: (
    message: string,
    type?: ToastType,
    options?: { duration?: number }
  ) => void
  hide: () => void
  showToast: (
    message: string,
    type?: ToastType,
    options?: { duration?: number }
  ) => void
}

interface ToastProviderProps {
  children: ReactNode
  defaultDuration?: number
}

// ✅ Export NOMMÉ pour permettre le ré-export dans contexts/index.js
export const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({
  children,
  defaultDuration = 2000,
}: ToastProviderProps) {
  const { parametres: _parametres } = useParametres()
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  })

  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const hide = useCallback(() => {
    clearTimer()
    setToast(prev => ({ ...prev, visible: false }))
  }, [clearTimer])

  // Rétro-compatible : show(message, type) continue de marcher.
  // Possibilité de passer une durée spécifique : show(msg, 'success', { duration: 3000 })
  // Respecte le paramètre global toasts_enabled (par défaut: true)
  const show = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      options: { duration?: number } = {}
    ) => {
      // TODO: Réactiver quand colonne toasts_enabled sera ajoutée à table parametres
      // const toastsEnabled = _parametres?.toasts_enabled ?? true
      // if (!toastsEnabled && type !== 'error') {
      //   return
      // }

      // Comportement par défaut: toasts toujours activés
      const _toastsEnabled = true

      clearTimer()
      setToast({ visible: true, message, type })
      const duration = Math.max(1000, options.duration ?? defaultDuration)
      timerRef.current = window.setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }))
        timerRef.current = null
      }, duration)
    },
    [defaultDuration, clearTimer] // TODO: Rajouter parametres?.toasts_enabled quand colonne ajoutée
  )

  return (
    <ToastContext.Provider value={{ show, hide, showToast: show }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastProvider
