import { memo, useMemo } from 'react'
import PropTypes from 'prop-types'
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
}) {
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
          <ImagePreview url={image} size="sm" />
        )}
        <div className="base-card__actions">
          <ButtonDelete onClick={onDelete} />

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
            onValid={val => onLabelChange(val)}
            rules={validationRules}
            aria-label={t('card.name')}
            onBlur={onBlur}
          />
        ) : (
          <span className="base-card__label">{label}</span>
        )}

        {categorieOptions.length > 0 && (
          <Select
            id={`base-categorie-${labelId}`}
            value={categorie}
            onChange={e => onCategorieChange(e.target.value)}
            options={
              Array.isArray(categorieOptions) && categorieOptions.length > 0
                ? categorieOptions
                : [{ value: '', label: t('card.noCategory') }]
            }
            aria-label={t('card.category')}
          />
        )}
      </div>
    </div>
  )
})

BaseCard.displayName = 'BaseCard'

BaseCard.propTypes = {
  image: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  editable: PropTypes.bool,
  onLabelChange: PropTypes.func,
  onBlur: PropTypes.func,
  labelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  categorie: PropTypes.string,
  onCategorieChange: PropTypes.func,
  categorieOptions: PropTypes.array,
  onDelete: PropTypes.func,
  checked: PropTypes.bool,
  onToggleCheck: PropTypes.func,
  className: PropTypes.string,
  imageComponent: PropTypes.node,
}

export default BaseCard
