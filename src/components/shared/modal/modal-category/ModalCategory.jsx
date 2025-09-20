import { Button, ButtonDelete, InputWithValidation, Modal } from '@/components'
import { noDoubleSpaces, noEdgeSpaces, validateNotEmpty } from '@/utils'
import { AnimatePresence, motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import './ModalCategory.scss'

export default function ModalCategory({
  isOpen,
  onClose,
  categories,
  onDeleteCategory,
  onAddCategory,
  newCategory,
  onChangeNewCategory,
}) {
  const inputRef = useRef(null)
  const [visibleCats, setVisibleCats] = useState([])

  useEffect(() => {
    const filtered = categories.filter(c => c.value !== 'none')
    setVisibleCats(filtered)
  }, [categories])

  const validationRules = [
    validateNotEmpty,
    noEdgeSpaces,
    noDoubleSpaces,
    val => {
      const labelClean = val.trim().replace(/\s+/g, ' ').toLowerCase()
      const exists = categories.some(
        cat => cat.label.trim().toLowerCase() === labelClean
      )
      return exists ? 'Cette catégorie existe déjà.' : ''
    },
  ]

  const handleSubmit = e => {
    e.preventDefault()
    
    const hasError = validationRules.some(rule => rule(newCategory))
    if (hasError) {
      inputRef.current?.blur()
      return
    }
    
    if (typeof onAddCategory === 'function') {
      // Passer la valeur de la catégorie en paramètre
      onAddCategory(e, newCategory)
    }
    onChangeNewCategory('')
  }

  const handleDelete = id => {
    onDeleteCategory(id) // ✅ envoie l’id maintenant
  }

  useEffect(() => {
    if (!isOpen) {
      onChangeNewCategory('')
    }
  }, [isOpen, onChangeNewCategory])

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Gérer les catégories"
        actions={[]}
      >
        <ul className="category-list">
          <AnimatePresence>
            {visibleCats.map(cat => (
              <motion.li
                key={cat.id} // ✅ utilise l'id
                className="category-list__item"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                {cat.label}
                <ButtonDelete
                  onClick={() => handleDelete(cat.id)} // ✅ envoie l’id
                  title={`Supprimer la catégorie ${cat.label}`}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <form className="category-form" onSubmit={handleSubmit}>
          <InputWithValidation
            id="new-category"
            ref={inputRef}
            value={newCategory}
            onChange={onChangeNewCategory}
            onValid={onChangeNewCategory}
            rules={validationRules}
            ariaLabel="Nouvelle catégorie"
          />
          <Button label="Ajouter" type="submit" />
        </form>
      </Modal>
    </>
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
