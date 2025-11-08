import { motion } from 'framer-motion'
import './ButtonDelete.scss'

interface ButtonDeleteProps {
  onClick: () => void
  title?: string
}

export default function ButtonDelete({ onClick, title = 'Supprimer' }: ButtonDeleteProps) {
  return (
    <motion.button
      className="button-delete"
      onClick={onClick}
      title={title}
      aria-label={title}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      🗑️
    </motion.button>
  )
}
