import PropTypes from 'prop-types'
import { Modal, Button, InputWithValidation } from '@/components'
import { validateNotEmpty, noEdgeSpaces, noDoubleSpaces } from '@/utils'

export default function ModalCategory({
  isOpen,
  onClose,
  categories,
  onDeleteCategory,
  onAddCategory,
  newCategory,
  onChangeNewCategory,
}) {
  const validationRules = [validateNotEmpty, noEdgeSpaces, noDoubleSpaces]
  const handleSubmit = (e) => {
    e.preventDefault()
    const invalid = validationRules.some((rule) => rule(newCategory))
    if (invalid) {
      const input = document.getElementById('new-category')
      input?.blur()
      return
    }
    onAddCategory(e)
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gérer les catégories"
      actions={[]}
    >
      <ul className="category-list">
        {categories
          .filter((c) => c.value !== 'none')
          .map((cat) => (
            <li key={cat.value} className="category-list__item">
              {cat.label}
              <button
                className="category-list__delete-btn"
                onClick={() => onDeleteCategory(cat.value)}
                aria-label={`Supprimer la catégorie ${cat.label}`}
              >
                🗑️
              </button>
            </li>
          ))}
      </ul>

      <form className="category-form" onSubmit={handleSubmit}>
        <InputWithValidation
          id="new-category"
          value={newCategory}
          onChange={onChangeNewCategory}
          onValid={(val) => onChangeNewCategory(val)}
          rules={[validateNotEmpty, noEdgeSpaces, noDoubleSpaces]}
          ariaLabel="Nouvelle catégorie"
        />
        <Button label="Ajouter" type="submit" />
      </form>
    </Modal>
  )
}

ModalCategory.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  categories: PropTypes.array.isRequired,
  onDeleteCategory: PropTypes.func.isRequired,
  onAddCategory: PropTypes.func.isRequired,
  newCategory: PropTypes.string.isRequired,
  onChangeNewCategory: PropTypes.func.isRequired,
}
