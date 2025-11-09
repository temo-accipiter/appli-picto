import { motion, AnimatePresence } from 'framer-motion'
import { memo } from 'react'
import './Toast.scss'

type ToastType = 'info' | 'success' | 'error' | 'warning'

interface ToastProps {
  message: string
  type?: ToastType
  visible: boolean
}

const Toast = memo(function Toast({
  message,
  type = 'info',
  visible,
}: ToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`toast toast--${type}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.2 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
})

export default Toast
