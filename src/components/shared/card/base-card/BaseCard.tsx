'use client'

import { memo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks'
import './BaseCard.scss'

/**
 * BaseCard - Composant de base pour afficher une carte
 *
 * Responsabilités :
 * - 🧱 Structure visuelle (layout grid avec zones image/contenu/actions)
 * - 🎨 États visuels (size, disabled, completed, checked)
 * - ♿ Accessibilité (ARIA, focus visible, reduced motion)
 * - 🎞️ Animations génériques (hover, scale)
 *
 * NE CONTIENT PAS :
 * - ❌ Logique métier (validation, callbacks, édition)
 * - ❌ Composants spécifiques (Input, Select, Button)
 * - ❌ Règles de validation
 *
 * Utilise composition via slots (imageSlot, contentSlot, actionsSlot)
 */

interface BaseCardProps {
  // 🧱 Slots de composition
  imageSlot?: ReactNode
  contentSlot?: ReactNode
  actionsSlot?: ReactNode

  // 🎨 États visuels uniquement
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  completed?: boolean
  checked?: boolean

  // ♿ Accessibilité
  className?: string
  ariaLabel?: string
  testId?: string | number
}

const BaseCard = memo(function BaseCard({
  imageSlot,
  contentSlot,
  actionsSlot,
  size = 'md',
  disabled = false,
  completed = false,
  checked = false,
  className = '',
  ariaLabel,
  testId,
}: BaseCardProps) {
  const prefersReducedMotion = useReducedMotion()

  // Classes d'état pour accessibilité TSA
  const stateClasses = [
    `base-card--${size}`,
    checked && 'base-card--checked',
    completed && 'base-card--completed',
    disabled && 'base-card--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.div
      className={`base-card ${stateClasses}`}
      role="article"
      aria-label={ariaLabel}
      data-testid={testId ? `base-card-${testId}` : undefined}
      whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
      transition={
        prefersReducedMotion ? {} : { duration: 0.2, ease: 'easeOut' }
      }
    >
      {/* Zone image + actions */}
      <div className="base-card__image-section">
        {imageSlot && <div className="base-card__image">{imageSlot}</div>}

        {/* Slot actions (checkbox, delete, etc.) */}
        {actionsSlot && <div className="base-card__actions">{actionsSlot}</div>}
      </div>

      {/* Zone contenu (label, catégorie, custom content) */}
      {contentSlot && <div className="base-card__content">{contentSlot}</div>}
    </motion.div>
  )
})

BaseCard.displayName = 'BaseCard'

export default BaseCard
