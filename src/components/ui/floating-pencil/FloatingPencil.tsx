'use client'

import { Pencil } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import './FloatingPencil.scss'

interface FloatingPencilProps {
  className?: string
}

export default function FloatingPencil({
  className = '',
}: FloatingPencilProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleClick = () => {
    router.push('/edition')
  }

  const isTableau = pathname === '/tableau'
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
      <Pencil size={20} strokeWidth={2} aria-hidden="true" />
    </motion.button>
  )
}
