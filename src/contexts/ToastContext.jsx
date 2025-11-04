// src/contexts/ToastContext.jsx
// Contexte de toasts : même comportement par défaut (2000ms) + options facultatives.
// - show(message, type = 'info', options?: { duration?: number })
// - hide() pour fermer manuellement
// - Respect du paramètre global toasts_enabled
// Aucune modification du composant <Toast /> ni de ses props.

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import Toast from '@/components/ui/toast/Toast'
import { useParametres } from '@/hooks'

// ✅ Export NOMMÉ pour permettre le ré-export dans contexts/index.js
export const ToastContext = createContext(null)

export function ToastProvider({ children, defaultDuration = 2000 }) {
  const { parametres } = useParametres()
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info',
  })

  const timerRef = useRef(null)

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
    (message, type = 'info', options = {}) => {
      // Vérifier si les toasts sont activés (par défaut: true si parametres est null/undefined)
      const toastsEnabled = parametres?.toasts_enabled ?? true

      // Ne rien faire si les toasts sont désactivés, sauf pour les erreurs critiques
      if (!toastsEnabled && type !== 'error') {
        return
      }

      clearTimer()
      setToast({ visible: true, message, type })
      const duration = Math.max(1000, options.duration ?? defaultDuration)
      timerRef.current = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }))
        timerRef.current = null
      }, duration)
    },
    [defaultDuration, clearTimer, parametres?.toasts_enabled]
  )

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </ToastContext.Provider>
  )
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
  defaultDuration: PropTypes.number,
}

export function useToast() {
  return useContext(ToastContext)
}

export default ToastProvider
