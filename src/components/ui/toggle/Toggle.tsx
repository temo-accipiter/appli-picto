'use client'

/**
 * Toggle (Switch) - Composant interrupteur accessible
 *
 * UX TSA :
 * - Animation douce (0.2s ease)
 * - États visuels clairs (ON/OFF)
 * - Prévisible et non agressif
 * - Respect prefers-reduced-motion
 *
 * Accessibilité :
 * - role="switch"
 * - aria-checked
 * - aria-label obligatoire
 * - Focus visible
 */

import React from 'react'
import { useReducedMotion } from '@/hooks'
import './Toggle.scss'

interface ToggleProps {
  /**
   * État activé/désactivé du toggle
   */
  checked: boolean
  /**
   * Callback lors du changement d'état
   */
  onChange: (checked: boolean) => void
  /**
   * Label accessible (obligatoire)
   */
  'aria-label': string
  /**
   * Toggle désactivé
   */
  disabled?: boolean
  /**
   * Classe CSS additionnelle
   */
  className?: string
  /**
   * ID unique (optionnel)
   */
  id?: string
}

export default function Toggle({
  checked,
  onChange,
  'aria-label': ariaLabel,
  disabled = false,
  className = '',
  id,
}: ToggleProps) {
  const reducedMotion = useReducedMotion()

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    // Espace ou Entrée pour toggler
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onChange(!checked)
    }
  }

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`toggle ${checked ? 'toggle--checked' : ''} ${
        disabled ? 'toggle--disabled' : ''
      } ${reducedMotion ? 'toggle--no-motion' : ''} ${className}`}
    >
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </button>
  )
}
