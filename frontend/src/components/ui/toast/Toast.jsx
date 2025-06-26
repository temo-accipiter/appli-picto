import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import './Toast.scss'

export default function Toast({ message, type = 'info', visible }) {
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
}

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['info', 'success', 'error']),
  visible: PropTypes.bool.isRequired,
}
