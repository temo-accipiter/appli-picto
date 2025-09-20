import {
    Button,
    Checkbox,
    EditionCard,
    EditionList,
    ModalAjout,
    ModalCategory,
    ModalConfirm,
    Select,
    SignedImage,
} from '@/components'
import { useToast } from '@/contexts'
import PropTypes from 'prop-types'
import { useState } from 'react'
import './TachesEdition.scss'

export default function ChecklistTachesEdition({
  items,
  categories,
  onToggleAujourdhui,
  onUpdateLabel,
  onUpdateCategorie,
  onDelete,
  resetEdition,
  onSubmitTask,
  onAddCategory,
  onDeleteCategory,
  filterCategory,
  onChangeFilterCategory,
  filterDone,
  onChangeFilterDone,
  onShowQuotaModal,
}) {
  const [errors, setErrors] = useState({})
  const [drafts, setDrafts] = useState({})
  const [successIds, setSuccessIds] = useState(new Set())
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [modalTacheOpen, setModalTacheOpen] = useState(false)
  const [manageCatOpen, setManageCatOpen] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [catASupprimer, setCatASupprimer] = useState(null)

  const { show } = useToast()

  const validateLabel = label => {
    const trimmed = label.trim()
    if (!trimmed || trimmed !== label || /\s{2,}/.test(label)) {
      return 'Nom invalide'
    }
    return ''
  }

  const handleChange = (id, value) => {
    setDrafts(prev => ({ ...prev, [id]: value }))
    setErrors(prev => ({ ...prev, [id]: '' }))
  }

  const handleBlur = (id, value) => {
    const error = validateLabel(value)
    if (error) {
      setErrors(prev => ({ ...prev, [id]: error }))
      return
    }

    onUpdateLabel(id, value)

    setDrafts(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setErrors(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    setSuccessIds(prev => new Set([...prev, id]))
    setTimeout(() => {
      setSuccessIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 600)
  }

  const handleAddCategory = async e => {
    e.preventDefault()
    const clean = newCatLabel.trim().replace(/\s+/g, ' ')
    if (!clean) return
    const slug = clean.toLowerCase().replace(/ /g, '-')
    await onAddCategory({ value: slug, label: clean })
    setNewCatLabel('')
    show('Catégorie ajoutée', 'success')
  }

  const handleRemoveCategory = async value => {
    await onDeleteCategory(value)
    setCatASupprimer(null)
    show('Catégorie supprimée', 'error')
  }

  return (
    <div className="checklist-edition">
      <EditionList
        title="🗒️ Tâches à éditer"
        items={items}
        emptyLabel="Aucune tâche à afficher"
        renderCard={t => (
          <EditionCard
            key={t.id}
            imageComponent={
              <SignedImage
                filePath={t.imagepath}
                bucket="images"
                alt={t.label}
                className="img-size-sm"
              />
            }
            labelId={t.id}
            label={drafts[t.id] ?? t.label}
            onLabelChange={val => handleChange(t.id, val)}
            onBlur={val => handleBlur(t.id, val)}
            onDelete={() => onDelete(t)}
            checked={!!t.aujourdhui}
            onToggleCheck={() => onToggleAujourdhui(t.id, t.aujourdhui)}
            categorie={t.categorie}
            onCategorieChange={val => onUpdateCategorie(t.id, val)}
            categorieOptions={categories}
            className={[
              t.aujourdhui ? 'active' : '',
              errors[t.id] ? 'input-field__input--error' : '',
              successIds.has(t.id) ? 'input-field__input--success' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        )}
      >
        <Button
          label="➕ Ajouter une tâche"
          onClick={async () => {
            if (onShowQuotaModal) {
              const canOpen = await onShowQuotaModal('task')
              if (canOpen) {
                setModalTacheOpen(true)
              }
            } else {
              setModalTacheOpen(true)
            }
          }}
        />
        <Button
          label="⚙️ Gérer catégories"
          onClick={() => setManageCatOpen(true)}
        />
        <Button
          label="Réinitialiser"
          onClick={() => setShowConfirmReset(true)}
        />
        <Select
          id="filter-category"
          label="Filtrer par catégorie"
          options={[{ value: 'all', label: 'Toutes' }, ...categories]}
          value={filterCategory}
          onChange={e => onChangeFilterCategory(e.target.value)}
        />
        <Checkbox
          id="filter-done"
          className="filtre-checkbox"
          label="Tâches cochées seulement"
          checked={filterDone}
          onChange={e => onChangeFilterDone(e.target.checked)}
          size="md"
        />
      </EditionList>

      <ModalAjout
        isOpen={modalTacheOpen}
        onClose={() => setModalTacheOpen(false)}
        includeCategory
        categories={categories}
        onSubmit={values => {
          onSubmitTask(values)
          setModalTacheOpen(false)
        }}
      />

      <ModalConfirm
        isOpen={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        onConfirm={() => {
          resetEdition()
          setShowConfirmReset(false)
        }}
      >
        ❗ Es-tu sûr de vouloir tout réinitialiser ?
      </ModalConfirm>

      <ModalCategory
        isOpen={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        categories={categories}
        onDeleteCategory={value => setCatASupprimer(value)}
        onAddCategory={handleAddCategory}
        newCategory={newCatLabel}
        onChangeNewCategory={setNewCatLabel}
      />

      <ModalConfirm
        isOpen={!!catASupprimer}
        onClose={() => setCatASupprimer(null)}
        confirmLabel="Supprimer"
        onConfirm={() => handleRemoveCategory(catASupprimer)}
      >
        <>
          ❗ Supprimer la catégorie “
          {categories.find(c => c.value === catASupprimer)?.label}” ?
          <br />
          Les tâches associées seront réattribuées à “Pas de catégorie”.
        </>
      </ModalConfirm>
    </div>
  )
}

ChecklistTachesEdition.propTypes = {
  items: PropTypes.array.isRequired,
  categories: PropTypes.array.isRequired,
  onToggleAujourdhui: PropTypes.func.isRequired,
  onUpdateLabel: PropTypes.func.isRequired,
  onUpdateCategorie: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  resetEdition: PropTypes.func.isRequired,
  onSubmitTask: PropTypes.func.isRequired,
  onAddCategory: PropTypes.func.isRequired,
  onDeleteCategory: PropTypes.func.isRequired,
  filterCategory: PropTypes.string.isRequired,
  onChangeFilterCategory: PropTypes.func.isRequired,
  filterDone: PropTypes.bool.isRequired,
  onChangeFilterDone: PropTypes.func.isRequired,
  onShowQuotaModal: PropTypes.func,
}
