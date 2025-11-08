import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react' // WCAG - Remplacement emoji par SVG
import './ButtonDelete.scss'

interface ButtonDeleteProps {
  onClick: () => void
  title?: string
}

export default function ButtonDelete({
  onClick,
  title = 'Supprimer',
}: ButtonDeleteProps) {
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
      <Trash2 size={16} aria-hidden="true" />
    </motion.button>
  )
}
