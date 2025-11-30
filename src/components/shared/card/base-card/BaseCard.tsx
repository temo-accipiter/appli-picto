'use client'

import { memo, useMemo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  InputWithValidation,
  Select,
  Checkbox,
  ImagePreview,
  ButtonDelete,
} from '@/components'
import { useI18n, useReducedMotion } from '@/hooks'
import {
  makeValidateNotEmpty,
  makeNoEdgeSpaces,
  makeNoDoubleSpaces,
} from '@/utils'
import './BaseCard.scss'

interface CategoryOption {
  value: string | number
  label: string
}

interface BaseCardProps {
  image?: string
  label: string
  editable?: boolean
  onLabelChange?: (newLabel: string) => void
  onBlur?: (val: string) => void
  labelId: string | number
  categorie?: string
  onCategorieChange?: (newCategorie: string) => void
  categorieOptions?: CategoryOption[]
  onDelete?: () => void
  checked?: boolean
  onToggleCheck?: (checked: boolean) => void
  className?: string
  imageComponent?: ReactNode
  disabled?: boolean
  completed?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const BaseCard = memo(function BaseCard({
  image,
  label,
  editable = false,
  onLabelChange,
  onBlur,
  labelId,
  categorie,
  onCategorieChange,
  categorieOptions = [],
  onDelete,
  checked = false,
  onToggleCheck,
  className = '',
  imageComponent,
  disabled = false,
  completed = false,
  size = 'md',
}: BaseCardProps) {
  const { t } = useI18n()
  const prefersReducedMotion = useReducedMotion()

  // Créer les fonctions de validation i18n avec useMemo
  const validationRules = useMemo(
    () => [makeValidateNotEmpty(t), makeNoEdgeSpaces(t), makeNoDoubleSpaces(t)],
    [t]
  )

  // Classes d'état pour accessibilité TSA
  const stateClasses = [
    `base-card--${size}`,
    checked && 'base-card--checked',
    completed && 'base-card--completed',
    disabled && 'base-card--disabled',
    editable && 'base-card--editable',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.div
      className={`base-card ${stateClasses}`}
      role="article"
      aria-label={`${t('card.item')} ${label}`}
      data-testid={`base-card-${labelId}`}
      whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
      transition={
        prefersReducedMotion ? {} : { duration: 0.2, ease: 'easeOut' }
      }
    >
      <div className="base-card__image-section">
        <div className="base-card__image">
          {imageComponent ? (
            imageComponent
          ) : (
            <ImagePreview url={image || ''} size="sm" />
          )}
        </div>

        {/* Actions séparées et empilées verticalement sur mobile */}
        <div className="base-card__actions">
          {onDelete && (
            <ButtonDelete
              onClick={disabled ? () => {} : onDelete}
              aria-label={t('card.delete')}
            />
          )}

          {onToggleCheck && (
            <Checkbox
              id={`base-checkbox-${labelId}`}
              checked={checked}
              onChange={e => !disabled && onToggleCheck?.(e.target.checked)}
              aria-label={completed ? t('card.completed') : t('card.active')}
              size="md"
            />
          )}
        </div>
      </div>

      <div className="base-card__content">
        {editable ? (
          <InputWithValidation
            id={`input-label-${labelId}`}
            value={label}
            onValid={val => !disabled && onLabelChange?.(val)}
            rules={validationRules}
            ariaLabel={t('card.name')}
            onBlur={val => !disabled && onBlur?.(val)}
          />
        ) : (
          <span className="base-card__label" title={label} role="doc-subtitle">
            {label}
          </span>
        )}

        {categorieOptions.length > 0 && (
          <Select
            id={`base-categorie-${labelId}`}
            value={categorie || ''}
            onChange={e => !disabled && onCategorieChange?.(e.target.value)}
            options={
              Array.isArray(categorieOptions) && categorieOptions.length > 0
                ? categorieOptions
                : [{ value: '', label: t('card.noCategory') }]
            }
          />
        )}
      </div>
    </motion.div>
  )
})

BaseCard.displayName = 'BaseCard'

export default BaseCard
