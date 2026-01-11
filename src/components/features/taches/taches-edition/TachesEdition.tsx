'use client'

import {
  Button,
  Checkbox,
  EditionCard,
  ModalAjout,
  ModalCategory,
  ModalConfirm,
  Select,
  SignedImage,
  DndGrid,
} from '@/components'
import { useI18n } from '@/hooks'
import React, { useState } from 'react'
import type { Categorie } from '@/types/global'
import { ChevronDown } from 'lucide-react'
import './TachesEdition.scss'

interface TacheItem {
  id: string | number
  label: string
  imagepath?: string
  aujourdhui?: boolean | number
  categorie?: string
  position?: number
}

interface TaskFormData {
  label: string
  categorie: string
  image: File
}

interface ChecklistTachesEditionProps {
  items: TacheItem[]
  categories: Categorie[]
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
  onReorder?: (ids: (string | number)[]) => void
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
  onReorder,
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
  const [showActions, setShowActions] = useState(false)

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
      <Button
        label={
          <span className="button-label">
            {t('tasks.title')}
            <ChevronDown
              className={`chevron ${showActions ? 'open' : ''}`}
              size={16}
              aria-hidden="true"
            />
          </span>
        }
        onClick={() => setShowActions(prev => !prev)}
        aria-expanded={showActions}
      />

      {showActions && (
        <div className="edition-section__actions">
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
        </div>
      )}

      {items.length === 0 ? (
        <div
          className="edition-section__empty"
          role="status"
          aria-live="polite"
        >
          💤 {t('tasks.noTasksToDisplay')}
        </div>
      ) : (
        <DndGrid
          items={items}
          onReorder={newItems => {
            if (onReorder) {
              onReorder(newItems.map(item => item.id))
            }
          }}
          renderItem={(item: TacheItem) => (
            <EditionCard
              imageComponent={
                <SignedImage
                  filePath={item.imagepath || ''}
                  bucket="images"
                  alt={item.label}
                  className="img-size-sm"
                />
              }
              labelId={item.id}
              label={drafts[item.id] ?? item.label}
              onLabelChange={val => handleChange(item.id, val)}
              onBlur={val => handleBlur(item.id, val)}
              onDelete={() => onDelete(item)}
              checked={!!item.aujourdhui}
              onToggleCheck={() => onToggleAujourdhui(item.id, item.aujourdhui)}
              categorie={item.categorie || ''}
              onCategorieChange={val => onUpdateCategorie(item.id, val)}
              categorieOptions={categories}
              className={[
                item.aujourdhui ? 'active' : '',
                errors[item.id] ? 'input-field__input--error' : '',
                successIds.has(item.id) ? 'input-field__input--success' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          )}
          columns={3}
          gap="medium"
          layout="custom"
          className="edition-section__grid"
          getItemId={(item: TacheItem) => item.id}
        />
      )}

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
        ❗ {t('edition.confirmResetAll')}
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
