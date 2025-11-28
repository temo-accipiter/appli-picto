'use client'

import { X } from 'lucide-react'
import './ButtonClose.scss'

interface ButtonCloseProps {
  onClick: () => void
  ariaLabel?: string
}

export default function ButtonClose({
  onClick,
  ariaLabel = 'Fermer',
}: ButtonCloseProps) {
  return (
    <button className="button-close" onClick={onClick} aria-label={ariaLabel}>
      <X size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
