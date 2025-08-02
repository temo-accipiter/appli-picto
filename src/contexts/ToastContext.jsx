import { createContext, useContext, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import Toast from '@/components/ui/toast/Toast'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info',
  })

  const show = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type })
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
    }, 2000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
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
}

export function useToast() {
  return useContext(ToastContext)
}
