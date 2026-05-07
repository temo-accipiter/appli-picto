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

  // Checkbox "publier" (cartes banque admin uniquement)
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

  const validationRules = useMemo(
    () => [makeValidateNotEmpty(t), makeNoEdgeSpaces(t), makeNoDoubleSpaces(t)],
    [t]
  )
  const selectedCategoryValue =
    categorie || defaultCategoryId || String(categorieOptions[0]?.value ?? '')

  const isBankCard = published !== undefined && onPublishedChange !== undefined

  return (
    <BaseCard
      size="md"
      disabled={disabled}
      checked={checked}
      disableHoverScale
      className={`card-edition${isBankCard ? ' card-edition--bank' : ''} ${className}`}
      ariaLabel={`${t('card.item')} ${label}`}
      testId={labelId}
      // 🖼️ Slot image — wrapper coloré (fond bleu-gris)
      imageSlot={
        <div className="card-edition__image-wrapper">
          {imageComponent || <ImagePreview url={image || ''} size="md" />}
        </div>
      }
      // 📝 Slot contenu : label + catégorie + footer actions
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
              onChange={value =>
                !disabled && onCategorieChange?.(String(value))
              }
              options={
                Array.isArray(categorieOptions) && categorieOptions.length > 0
                  ? categorieOptions
                  : [{ value: '', label: t('card.noCategory') }]
              }
            />
          )}

          {/* Séparateur + ligne d'actions */}
          <div
            className="card-edition__separator"
            role="separator"
            aria-hidden="true"
          />
          <div className="card-edition__footer">
            <Checkbox
              id={`checkbox-${labelId}`}
              checked={checked}
              onChange={() => !disabled && !checkboxDisabled && onToggleCheck()}
              aria-label={checked ? t('card.visible') : t('card.hidden')}
              {...(isBankCard
                ? {}
                : { label: checked ? t('card.shown') : t('card.show') })}
              size="md"
              disabled={disabled || checkboxDisabled}
            />
            {isBankCard && onPublishedChange && (
              <Toggle
                id={`toggle-published-${labelId}`}
                checked={published!}
                onChange={newPublished =>
                  !disabled && onPublishedChange(newPublished)
                }
                aria-label={published ? 'Carte publiée' : 'Carte dépubliée'}
                disabled={disabled}
              />
            )}
            {onDelete && (
              <ButtonDelete
                onClick={disabled ? () => {} : onDelete}
                aria-label={t('card.delete')}
              />
            )}
          </div>
        </>
      }
      // actionsSlot vide — actions intégrées dans contentSlot (footer)
    />
  )
})

CardEdition.displayName = 'CardEdition'

export default CardEdition
