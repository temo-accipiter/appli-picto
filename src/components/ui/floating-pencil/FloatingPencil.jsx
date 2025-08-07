import { Pencil } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import PropTypes from 'prop-types'
import './FloatingPencil.scss'

export default function FloatingPencil({ className = '' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleClick = () => {
    navigate('/edition')
  }

  const isTableau = location.pathname === '/tableau'
  if (!isTableau) return null

  return (
    <motion.button
      className={`floating-pencil ${className}`}
      onClick={handleClick}
      aria-label="Édition"
      title="Édition"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Pencil size={20} strokeWidth={2} />
    </motion.button>
  )
}

FloatingPencil.propTypes = {
  className: PropTypes.string,
}
