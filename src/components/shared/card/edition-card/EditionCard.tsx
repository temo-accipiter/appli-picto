'use client'

import { memo, useMemo, ReactNode } from 'react'
import {
  BaseCard,
  InputWithValidation,
  Select,
  Checkbox,
  Toggle,
  ImagePreview,
  ButtonDelete,
} from '@/components'
import { useI18n } from '@/hooks'
import {
  makeValidateNotEmpty,
  makeNoEdgeSpaces,
  makeNoDoubleSpaces,
} from '@/utils'
import './EditionCard.scss'

/**
 * EditionCard - Carte pour éditer une tâche ou récompense
 *
 * Responsabilités :
 * - ✏️ Logique édition (input label, validation, catégorie)
 * - 🗑️ Actions métier (delete, toggle checkbox)
 * - 🎛️ Gestion callbacks et état
 *
 * Compose BaseCard via slots (imageSlot, contentSlot, actionsSlot)
 */

interface CategoryOption {
  value: string | number
  label: string
}

interface EditionCardProps {
  // Données
  image?: string
  label: string
  categorie?: string
  defaultCategoryId?: string
  checked: boolean

  // Callbacks métier
  onLabelChange?: (newLabel: string) => void
  onBlur?: (val: string) => void
  onCategorieChange?: (newCategorie: string) => void
  onToggleCheck: () => void
  onDelete?: () => void

  // Options métier
  categorieOptions?: CategoryOption[]
  labelId: string | number

  // 🆕 Checkbox "publier" (cartes banque admin uniquement)
  published?: boolean
  onPublishedChange?: (published: boolean) => void

  // UI
  className?: string
  imageComponent?: ReactNode
  editable?: boolean
  disabled?: boolean
  checkboxDisabled?: boolean
}

const CardEdition = memo(function CardEdition({
  image,
  label,
  categorie,
  defaultCategoryId,
  checked,
  onLabelChange,
  onBlur,
  onCategorieChange,
  onToggleCheck,
  onDelete,
  categorieOptions = [],
  labelId,
  className = '',
  imageComponent,
  editable = true,
  disabled = false,
  checkboxDisabled = false,
  published,
  onPublishedChange,
}: EditionCardProps) {
  const { t } = useI18n()

  // Règles de validation i18n
  const validationRules = useMemo(
    () => [makeValidateNotEmpty(t), makeNoEdgeSpaces(t), makeNoDoubleSpaces(t)],
    [t]
  )
  const selectedCategoryValue =
    categorie || defaultCategoryId || String(categorieOptions[0]?.value ?? '')

  return (
    <BaseCard
      size="md"
      disabled={disabled}
      checked={checked}
      className={`card-edition ${className}`}
      ariaLabel={`${t('card.item')} ${label}`}
      testId={labelId}
      // 🖼️ Slot image
      imageSlot={imageComponent || <ImagePreview url={image || ''} size="sm" />}
      // 📝 Slot contenu (input label + select catégorie)
      contentSlot={
        <>
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
            <span
              className="base-card__label"
              title={label}
              role="doc-subtitle"
            >
              {label}
            </span>
          )}

          {categorieOptions.length > 0 && (
            <Select
              id={`select-categorie-${labelId}`}
              value={selectedCategoryValue}
              onChange={e => !disabled && onCategorieChange?.(e.target.value)}
              includePlaceholder={false}
              options={
                Array.isArray(categorieOptions) && categorieOptions.length > 0
                  ? categorieOptions
                  : [{ value: '', label: t('card.noCategory') }]
              }
            />
          )}
        </>
      }
      // 🎛️ Slot actions (delete + checkbox publier + checkbox timeline)
      actionsSlot={
        <>
          {onDelete && (
            <ButtonDelete
              onClick={disabled ? () => {} : onDelete}
              aria-label={t('card.delete')}
            />
          )}

          {/* 🆕 Toggle "publier" (cartes banque admin uniquement) */}
          {published !== undefined && onPublishedChange && (
            <Toggle
              id={`toggle-published-${labelId}`}
              checked={published}
              onChange={newPublished =>
                !disabled && onPublishedChange(newPublished)
              }
              aria-label={published ? 'Carte publiée' : 'Carte dépubliée'}
              disabled={disabled}
            />
          )}

          <Checkbox
            id={`checkbox-${labelId}`}
            checked={checked}
            onChange={() => !disabled && !checkboxDisabled && onToggleCheck()}
            aria-label={checked ? t('card.visible') : t('card.hidden')}
            size="md"
            disabled={disabled || checkboxDisabled}
          />
        </>
      }
    />
  )
})

CardEdition.displayName = 'CardEdition'

export default CardEdition
