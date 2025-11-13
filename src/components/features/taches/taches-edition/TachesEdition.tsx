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
import { useI18n } from '@/hooks'
import React, { useState } from 'react'
import './TachesEdition.scss'

interface CategoryOption {
  value: string | number
  label: string
}

interface TacheItem {
  id: string | number
  label: string
  imagepath?: string
  aujourdhui?: boolean | number
  categorie?: string
}

interface TaskFormData {
  label: string
  categorie: string
  image: File
}

interface ChecklistTachesEditionProps {
  items: TacheItem[]
  categories: CategoryOption[]
  onToggleAujourdhui: (
    id: string | number,
    currentState: boolean | number | undefined
  ) => void
  onUpdateLabel: (id: string | number, label: string) => void
  onUpdateCategorie: (id: string | number, categorie: string) => void
  onDelete: (item: TacheItem) => void
  resetEdition: () => void
  onSubmitTask: (data: TaskFormData) => void
  onAddCategory: (e: React.FormEvent, label: string) => Promise<void>
  onDeleteCategory: (value: string | number) => Promise<void>
  filterCategory: string
  onChangeFilterCategory: (value: string) => void
  filterDone: boolean
  onChangeFilterDone: (checked: boolean) => void
  onShowQuotaModal?: (type: string) => Promise<boolean>
}

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
}: ChecklistTachesEditionProps) {
  const [errors, setErrors] = useState<Record<string | number, string>>({})
  const [drafts, setDrafts] = useState<Record<string | number, string>>({})
  const [successIds, setSuccessIds] = useState(new Set<string | number>())
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [modalTacheOpen, setModalTacheOpen] = useState(false)
  const [manageCatOpen, setManageCatOpen] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [catASupprimer, setCatASupprimer] = useState<string | number | null>(
    null
  )

  const { t } = useI18n()

  const validateLabel = (label: string): string => {
    const trimmed = label.trim()
    if (!trimmed || trimmed !== label || /\s{2,}/.test(label)) {
      return t('tasks.invalidName')
    }
    return ''
  }

  const handleChange = (id: string | number, value: string) => {
    setDrafts(prev => ({ ...prev, [id]: value }))
    setErrors(prev => ({ ...prev, [id]: '' }))
  }

  const handleBlur = (id: string | number, value: string) => {
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

  const handleAddCategory = async (
    e: React.FormEvent,
    categoryLabel: string | null = null
  ) => {
    e.preventDefault()

    // Utiliser le label passé en argument ou le state local
    const labelToUse = categoryLabel ?? newCatLabel
    const clean = labelToUse.trim().replace(/\s+/g, ' ')

    if (!clean) return

    // Le toast est déjà géré dans le hook useCategories.addCategory
    await onAddCategory(e, clean)
    setNewCatLabel('')
  }

  const handleRemoveCategory = async (value: string | number) => {
    // Le toast est déjà géré dans le hook useCategories.deleteCategory
    await onDeleteCategory(value)
    setCatASupprimer(null)
  }

  return (
    <div className="checklist-edition">
      <EditionList
        title={`🗒️ ${t('tasks.toEdit')}`}
        items={items}
        emptyLabel={t('tasks.noTasksToDisplay')}
        renderCard={t => (
          <EditionCard
            key={t.id}
            imageComponent={
              <SignedImage
                filePath={t.imagepath || ''}
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
            categorie={t.categorie || ''}
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
          label={`➕ ${t('tasks.addTask')}`}
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
          label={`⚙️ ${t('tasks.manageCategories')}`}
          onClick={() => setManageCatOpen(true)}
        />
        <Button
          label={t('tasks.reset')}
          onClick={() => setShowConfirmReset(true)}
        />
        <Select
          id="filter-category"
          label={t('tasks.filterByCategory')}
          options={[{ value: 'all', label: t('tasks.all') }, ...categories]}
          value={filterCategory}
          onChange={e => onChangeFilterCategory(e.target.value)}
        />
        <Checkbox
          id="filter-done"
          className="filtre-checkbox"
          label={t('tasks.checkedOnly')}
          checked={filterDone}
          onChange={e => onChangeFilterDone(e.target.checked)}
          size="md"
        />
      </EditionList>

      <ModalAjout
        isOpen={modalTacheOpen}
        onClose={() => setModalTacheOpen(false)}
        includeCategory
        categories={categories as any}
        onSubmit={(values: TaskFormData) => {
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
        ❗ {t('edition.confirmResetAll')}
      </ModalConfirm>

      <ModalCategory
        isOpen={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        categories={categories as any}
        onDeleteCategory={value => setCatASupprimer(value)}
        onAddCategory={handleAddCategory}
        newCategory={newCatLabel}
        onChangeNewCategory={setNewCatLabel}
      />

      <ModalConfirm
        isOpen={!!catASupprimer}
        onClose={() => setCatASupprimer(null)}
        confirmLabel={t('actions.delete')}
        onConfirm={() => handleRemoveCategory(catASupprimer!)}
      >
        <>
          ❗ {t('edition.confirmDeleteCategory')}
          {categories.find(c => c.value === catASupprimer)?.label}&rdquo; ?
          <br />
          {t('edition.categoryReassignmentWarning')}
        </>
      </ModalConfirm>
    </div>
  )
}
