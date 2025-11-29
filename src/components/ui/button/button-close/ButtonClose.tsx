'use client'

import { X } from 'lucide-react'
import './ButtonClose.scss'

interface ButtonCloseProps {
  onClick: () => void
  ariaLabel?: string
  size?: 'small' | 'large'
}

export default function ButtonClose({
  onClick,
  ariaLabel = 'Fermer',
  size = 'small',
}: ButtonCloseProps) {
  const iconSize = size === 'large' ? 28 : 20

  return (
    <button
      className={`button-close button-close--${size}`}
      onClick={onClick}
      aria-label={ariaLabel}
      type="button"
    >
      <X size={iconSize} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
