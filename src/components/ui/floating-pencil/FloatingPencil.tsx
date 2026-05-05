'use client'

import { Pencil } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useReducedMotion } from '@/hooks'
import './FloatingPencil.scss'

interface FloatingPencilProps {
  className?: string
}

export default function FloatingPencil({
  className = '',
}: FloatingPencilProps) {
  const router = useRouter()
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()

  const isTableau = pathname === '/tableau'
  if (!isTableau) return null

  return (
    <button
      type="button"
      className={`floating-pencil${prefersReducedMotion ? ' floating-pencil--no-motion' : ''} ${className}`.trim()}
      onClick={() => router.push('/edition')}
      aria-label="Quitter le tableau et retourner à l'édition"
    >
      <Pencil size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
