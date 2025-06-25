/*import PropTypes from 'prop-types'
import { Input, Select, Checkbox, ImagePreview } from '@/components'
import './CardEdition.scss'

export default function CardEdition({
  imageUrl,
  label,
  onLabelChange,
  onBlur,
  onDelete,
  checked,
  onToggle,
  error = '',
  className = '',
  showCategorieSelect = false,
  categorie = '',
  onCategorieChange,
  categorieOptions = [],
  labelId,
}) {
  return (
    <div className={`card-edition ${className}`}>
      <div className="card-edition__col image">
        <ImagePreview url={imageUrl} size="sm" />
        <Checkbox
          id={`edition-checkbox-${labelId}`}
          checked={checked}
          onChange={onToggle}
          label=""
          aria-label="Actif"
          size="md"
        />
      </div>
      <div className="card-edition__col info">
        <Input
          id={`edition-label-${labelId}`}
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          onBlur={onBlur}
          error={error}
          aria-label="Nom"
        />

        <div className="card-edition__row">
          {showCategorieSelect && (
            <Select
              id={`edition-categorie-${labelId}`}
              value={categorie}
              onChange={(e) => onCategorieChange(e.target.value)}
              options={categorieOptions}
              aria-label="Catégorie"
            />
          )}

          <button
            className="card-edition__delete-btn"
            onClick={onDelete}
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

CardEdition.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onLabelChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  checked: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  error: PropTypes.string,
  className: PropTypes.string,
  showCategorieSelect: PropTypes.bool,
  categorie: PropTypes.string,
  onCategorieChange: PropTypes.func,
  categorieOptions: PropTypes.array,
  labelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}
*/
import PropTypes from 'prop-types'
import {
  InputWithValidation,
  Select,
  Checkbox,
  ImagePreview,
} from '@/components'
import { validateNotEmpty, noEdgeSpaces, noDoubleSpaces } from '@/utils'
import './CardEdition.scss'

export default function CardEdition({
  imageUrl,
  label,
  onLabelChange,
  onDelete,
  checked,
  onToggle,
  showCategorieSelect = false,
  categorie = '',
  onCategorieChange,
  categorieOptions = [],
  labelId,
  className = '',
}) {
  return (
    <div className={`card-edition ${className}`}>
      <div className="card-edition__col image">
        <ImagePreview url={imageUrl} size="sm" />
        <Checkbox
          id={`edition-checkbox-${labelId}`}
          checked={checked}
          onChange={onToggle}
          label=""
          aria-label="Actif"
          size="md"
        />
      </div>

      <div className="card-edition__col info">
        <InputWithValidation
          id={`input-label-${labelId}`} // ✅ id unique ici
          value={label}
          onValid={(val) => onLabelChange(val)}
          rules={[validateNotEmpty, noEdgeSpaces, noDoubleSpaces]}
          ariaLabel="Nom"
        />

        <div className="card-edition__row">
          {showCategorieSelect && (
            <Select
              id={`edition-categorie-${labelId}`}
              value={categorie}
              onChange={(e) => onCategorieChange(e.target.value)}
              options={categorieOptions}
              aria-label="Catégorie"
            />
          )}

          <button
            className="card-edition__delete-btn"
            onClick={onDelete}
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

CardEdition.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onLabelChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  checked: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  showCategorieSelect: PropTypes.bool,
  categorie: PropTypes.string,
  onCategorieChange: PropTypes.func,
  categorieOptions: PropTypes.array,
  labelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  className: PropTypes.string,
}
