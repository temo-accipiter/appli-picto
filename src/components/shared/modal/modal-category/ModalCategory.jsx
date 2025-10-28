import { Button, ButtonDelete, InputWithValidation, Modal } from '@/components'
import { useI18n } from '@/hooks'
import {
  makeNoDoubleSpaces,
  makeNoEdgeSpaces,
  makeValidateNotEmpty,
} from '@/utils'
import { AnimatePresence, motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const { t } = useI18n()
  const inputRef = useRef(null)
  const [visibleCats, setVisibleCats] = useState([])

  // Créer les fonctions de validation i18n avec useMemo
  const validateNotEmpty = useMemo(() => makeValidateNotEmpty(t), [t])
  const noEdgeSpaces = useMemo(() => makeNoEdgeSpaces(t), [t])
  const noDoubleSpaces = useMemo(() => makeNoDoubleSpaces(t), [t])

  useEffect(() => {
    const filtered = categories.filter(c => c.value !== 'none')
    setVisibleCats(filtered)
  }, [categories])

  const validationRules = useMemo(
    () => [
      validateNotEmpty,
      noEdgeSpaces,
      noDoubleSpaces,
      val => {
        const labelClean = val.trim().replace(/\s+/g, ' ').toLowerCase()
        const exists = categories.some(
          cat => cat.label.trim().toLowerCase() === labelClean
        )
        return exists ? t('edition.categoryExists') : ''
      },
    ],
    [validateNotEmpty, noEdgeSpaces, noDoubleSpaces, categories, t]
  )

  const handleSubmit = e => {
    e.preventDefault()

    const hasError = validationRules.some(rule => rule(newCategory))
    if (hasError) {
      inputRef.current?.blur()
      return
    }

    if (typeof onAddCategory === 'function') {
      const categoryToAdd = newCategory // Sauvegarder la valeur AVANT de vider
      onAddCategory(e, categoryToAdd)
      onChangeNewCategory('') // Vider APRÈS l'appel
    }
  }

  const handleDelete = value => {
    onDeleteCategory(value) // Envoie le 'value' (slug) pas l'id
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
        title={t('edition.manageCategoriesTitle')}
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
                  onClick={() => handleDelete(cat.value)} // Envoie le 'value' (slug)
                  title={`${t('edition.deleteCategoryTitle')} ${cat.label}`}
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
            ariaLabel={t('edition.newCategory')}
          />
          <Button label={t('actions.add')} type="submit" />
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
