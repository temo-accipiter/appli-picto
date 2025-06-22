// src/components/card/Card.jsx
import PropTypes from 'prop-types'
import {
  DeleteButton,
  Select,
  Input,
  Checkbox,
  ImagePreview,
} from '@/components'
import './Card.scss'

export default function Card({
  id,
  imageSrc,
  label,
  editableLabel = false,
  onLabelChange,
  showSelect = false,
  categories = [],
  selectedCategory,
  onCategoryChange,
  showCheckbox = false,
  checked = false,
  onCheckboxChange,
  showDelete = false,
  onDelete,
  orientation = 'horizontal',
  className = '',
  ...rest
}) {
  return (
    <div
      className={`card card--${orientation} ${className}`}
      role="group"
      aria-labelledby={`card-label-${id}`}
      {...rest}
    >
      {imageSrc && (
        <div className="card__col card__col--image">
          <ImagePreview url={imageSrc} alt={label} size="md" />
        </div>
      )}
      <div className="card__col card__col--info">
        {editableLabel ? (
          <Input
            id={`card-label-${id}`}
            value={label}
            onChange={(e) => onLabelChange(id, e.target.value)}
            className="editable-label"
          />
        ) : (
          <span id={`card-label-${id}`} className="card__label">
            {label}
          </span>
        )}

        {showSelect && (
          <Select
            id={`card-select-${id}`}
            options={categories}
            value={selectedCategory}
            onChange={(e) => onCategoryChange(id, e.target.value)}
            className="editable-categorie"
          />
        )}
      </div>

      {(showCheckbox || showDelete) && (
        <div className="card__col card__col--actions">
          {showDelete && <DeleteButton onClick={() => onDelete(id)} />}
          {showCheckbox && (
            <Checkbox
              id={`card-checkbox-${id}`}
              checked={checked}
              onChange={() => onCheckboxChange(id, !checked)}
              label=""
              aria-label="Toggle"
            />
          )}
        </div>
      )}
    </div>
  )
}

Card.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  imageSrc: PropTypes.string,
  label: PropTypes.string.isRequired,
  editableLabel: PropTypes.bool,
  onLabelChange: PropTypes.func,
  showSelect: PropTypes.bool,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  selectedCategory: PropTypes.string,
  onCategoryChange: PropTypes.func,
  showCheckbox: PropTypes.bool,
  checked: PropTypes.bool,
  onCheckboxChange: PropTypes.func,
  showDelete: PropTypes.bool,
  onDelete: PropTypes.func,
  orientation: PropTypes.oneOf(['horizontal', 'vertical']),
  className: PropTypes.string,
}
