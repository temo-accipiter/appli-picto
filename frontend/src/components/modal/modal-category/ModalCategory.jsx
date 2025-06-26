import PropTypes from 'prop-types'
import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Modal,
  Button,
  InputWithValidation,
  ButtonDelete,
  Toast,
} from '@/components'
import { validateNotEmpty, noEdgeSpaces, noDoubleSpaces } from '@/utils'
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
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info',
  })

  useEffect(() => {
    const filtered = categories.filter((c) => c.value !== 'none')
    setVisibleCats(filtered)
  }, [categories])

  const validationRules = [
    validateNotEmpty,
    noEdgeSpaces,
    noDoubleSpaces,
    (val) => {
      const labelClean = val.trim().replace(/\s+/g, ' ').toLowerCase()
      const exists = categories.some(
        (cat) => cat.label.trim().toLowerCase() === labelClean
      )
      return exists ? 'Cette catégorie existe déjà.' : ''
    },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    const hasError = validationRules.some((rule) => rule(newCategory))
    if (hasError) {
      inputRef.current?.blur()
      return
    }
    onAddCategory(e)
    onChangeNewCategory('')
    showToast('Catégorie ajoutée', 'success')
  }

  const handleDelete = (value) => {
    onDeleteCategory(value)
    showToast('Catégorie supprimée', 'success')
  }

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 2000)
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
            {visibleCats.map((cat) => (
              <motion.li
                key={cat.value}
                className="category-list__item"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                {cat.label}
                <ButtonDelete
                  onClick={() => handleDelete(cat.value)}
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

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
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
