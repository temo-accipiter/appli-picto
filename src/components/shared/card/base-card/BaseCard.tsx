import { memo, useMemo, ReactNode } from 'react'
import {
  InputWithValidation,
  Select,
  Checkbox,
  ImagePreview,
  ButtonDelete,
} from '@/components'
import { useI18n } from '@/hooks'
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
}: BaseCardProps) {
  const { t } = useI18n()

  // Créer les fonctions de validation i18n avec useMemo
  const validationRules = useMemo(
    () => [makeValidateNotEmpty(t), makeNoEdgeSpaces(t), makeNoDoubleSpaces(t)],
    [t]
  )

  return (
    <div className={`base-card ${className}`}>
      <div className="base-card__col image">
        {imageComponent ? (
          imageComponent
        ) : (
          <ImagePreview url={image || ''} size="sm" />
        )}
        <div className="base-card__actions">
          <ButtonDelete onClick={onDelete || (() => {})} />

          <Checkbox
            id={`base-checkbox-${labelId}`}
            checked={checked}
            onChange={e => onToggleCheck?.(e.target.checked)}
            aria-label={t('card.active')}
            size="md"
          />
        </div>
      </div>

      <div className="base-card__col info">
        {editable ? (
          <InputWithValidation
            id={`input-label-${labelId}`}
            value={label}
            onValid={val => onLabelChange?.(val)}
            rules={validationRules}
            ariaLabel={t('card.name')}
            onBlur={val => onBlur?.(val)}
          />
        ) : (
          <span className="base-card__label">{label}</span>
        )}

        {categorieOptions.length > 0 && (
          <Select
            id={`base-categorie-${labelId}`}
            value={categorie || ''}
            onChange={e => onCategorieChange?.(e.target.value)}
            options={
              Array.isArray(categorieOptions) && categorieOptions.length > 0
                ? categorieOptions
                : [{ value: '', label: t('card.noCategory') }]
            }
          />
        )}
      </div>
    </div>
  )
})

BaseCard.displayName = 'BaseCard'

export default BaseCard
