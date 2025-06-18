// src/components/card/Card.jsx
import PropTypes from 'prop-types'
import { Button, Select, Input, Checkbox } from '@/components'
//import './Card.scss'

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
  className = '',
  ...rest
}) {
  return (
    <div
      className={`card ${className}`}
      role="group"
      aria-labelledby={`card-label-${id}`}
      {...rest}
    >
      {imageSrc && <img src={imageSrc} alt="" className="card__image" />}

      <div className="card__body">
        {editableLabel ? (
          <Input
            id={`card-label-${id}`}
            value={label}
            onChange={(e) => onLabelChange(id, e.target.value)}
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
          />
        )}

        {showCheckbox && (
          <Checkbox
            id={`card-checkbox-${id}`}
            checked={checked}
            onChange={() => onCheckboxChange(id, !checked)}
            label=""
            aria-label="Toggle"
          />
        )}

        {showDelete && (
          <Button
            variant="reset"
            label="✖"
            onClick={() => onDelete(id)}
            aria-label="Supprimer"
            className="card__delete-btn"
          />
        )}
      </div>
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
  className: PropTypes.string,
}
