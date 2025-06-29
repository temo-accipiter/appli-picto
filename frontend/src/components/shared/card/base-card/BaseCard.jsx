import PropTypes from 'prop-types'
import {
  InputWithValidation,
  Select,
  Checkbox,
  ImagePreview,
  ButtonDelete,
} from '@/components'
import { validateNotEmpty, noEdgeSpaces, noDoubleSpaces } from '@/utils'
import './BaseCard.scss'

export default function BaseCard({
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
}) {
  return (
    <div className={`base-card ${className}`}>
      <div className="base-card__col image">
        <ImagePreview url={image} size="sm" />
        <Checkbox
          id={`base-checkbox-${labelId}`}
          checked={checked}
          onChange={onToggleCheck}
          aria-label="Actif"
          size="md"
        />
      </div>

      <div className="base-card__col info">
        {editable ? (
          <InputWithValidation
            id={`input-label-${labelId}`}
            value={label}
            onValid={(val) => onLabelChange(val)}
            rules={[validateNotEmpty, noEdgeSpaces, noDoubleSpaces]}
            ariaLabel="Nom"
            onBlur={onBlur}
          />
        ) : (
          <span className="base-card__label">{label}</span>
        )}

        <div className="base-card__row">
          {categorieOptions.length > 0 && (
            <Select
              id={`base-categorie-${labelId}`}
              value={categorie}
              onChange={(e) => onCategorieChange(e.target.value)}
              options={categorieOptions}
              aria-label="Catégorie"
            />
          )}
          <ButtonDelete onClick={onDelete} />
        </div>
      </div>
    </div>
  )
}

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
}
