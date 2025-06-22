import { useState } from 'react'
import PropTypes from 'prop-types'
import { Modal, Button, Input } from '@/components'

export default function ModalCategory({
  isOpen,
  onClose,
  categories,
  onDeleteCategory,
  onAddCategory,
  newCategory,
  onChangeNewCategory,
}) {
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = newCategory.trim()
    if (!trimmed) {
      setError('Le nom de la catégorie ne peut pas être vide.')
      return
    }
    setError('')
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
        <Input
          id="new-category"
          label="Nouvelle catégorie"
          value={newCategory}
          onChange={(e) => {
            onChangeNewCategory(e.target.value)
            if (error) setError('')
          }}
          error={error}
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
