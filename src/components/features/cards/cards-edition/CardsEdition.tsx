'use client'

import {
  Button,
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
// ✅ Réutiliser le même CSS que TachesEdition
import '@/components/features/taches/taches-edition/TachesEdition.scss'

interface CardItem {
  id: string | number
  name: string
  image_url?: string
  categorie?: string
  position?: number
}

interface CardFormData {
  label: string
  categorie: string
  image: File
  imagePath: string // ✅ Path Storage uploadé: {accountId}/cards/{cardId}.jpg
  imageUrl?: string
  cardId: string // ✅ UUID v4 généré client-side
}

interface CardsEditionProps {
  items: CardItem[]
  categories: Categorie[]
  onUpdateLabel: (id: string | number, label: string) => void
  onUpdateCategorie: (id: string | number, categorie: string) => void
  onDelete: (item: CardItem) => void
  onSubmitCard: (data: CardFormData) => void
  onAddCategory: (e: React.FormEvent, label: string) => Promise<void>
  onDeleteCategory: (value: string | number) => Promise<void>
  filterCategory: string
  onChangeFilterCategory: (value: string) => void
  onReorder?: (ids: (string | number)[]) => void
  isSubmittingCategory?: boolean
  // ── PHASE 1 : Checkbox bibliothèque contrôlée par timeline ────────────────
  /**
   * Slots de la timeline active (pour calculer checked).
   * Si undefined, la checkbox est masquée (pas de timeline active).
   */
  timelineSlots?: Array<{
    id: string
    card_id: string | null
    kind: 'step' | 'reward'
    position: number
  }>
  /**
   * Handler checkbox : ajoute carte au premier slot étape vide ou retire de tous.
   * Fourni par Edition.tsx qui a accès à useSlots.
   */
  onToggleCardInTimeline?: (
    cardId: string,
    currentlyChecked: boolean
  ) => Promise<void>
  /**
   * Guards : checkbox disabled si offline/execution-only/session locked.
   */
  checkboxDisabled?: boolean
}

export default function CardsEdition({
  items,
  categories,
  onUpdateLabel,
  onUpdateCategorie,
  onDelete,
  onSubmitCard,
  onAddCategory,
  onDeleteCategory,
  filterCategory,
  onChangeFilterCategory,
  onReorder,
  isSubmittingCategory = false,
  timelineSlots,
  onToggleCardInTimeline,
  checkboxDisabled = false,
}: CardsEditionProps) {
  const [errors, setErrors] = useState<Record<string | number, string>>({})
  const [drafts, setDrafts] = useState<Record<string | number, string>>({})
  const [successIds, setSuccessIds] = useState(new Set<string | number>())
  const [modalCardOpen, setModalCardOpen] = useState(false)
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

    const labelToUse = categoryLabel ?? newCatLabel
    const clean = labelToUse.trim().replace(/\s+/g, ' ')

    if (!clean) return

    await onAddCategory(e, clean)
    setNewCatLabel('')
  }

  const handleRemoveCategory = async (value: string | number) => {
    await onDeleteCategory(value)
    setCatASupprimer(null)
  }

  /**
   * PHASE 1 : Calculer si une carte est présente dans au moins un slot.
   * checked = true si card_id existe dans timelineSlots.
   */
  const isCardInTimeline = (cardId: string | number): boolean => {
    if (!timelineSlots) return false
    return timelineSlots.some(slot => slot.card_id === String(cardId))
  }

  /**
   * PHASE 1 : Handler checkbox — toggle carte dans timeline.
   */
  const handleToggleCheckbox = async (cardId: string | number) => {
    if (!onToggleCardInTimeline) return

    const currentlyChecked = isCardInTimeline(cardId)
    await onToggleCardInTimeline(String(cardId), currentlyChecked)
  }

  return (
    <div className="checklist-edition">
      <Button
        label={
          <span className="button-label">
            ⚙️ Options d&apos;édition
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
            label={`➕ ${t('cards.addCard') || 'Créer carte'}`}
            onClick={() => setModalCardOpen(true)}
          />
          <Button
            label={`⚙️ ${t('tasks.manageCategories')}`}
            onClick={() => setManageCatOpen(true)}
          />
          <Select
            id="filter-category"
            label={t('tasks.filterByCategory')}
            options={[
              { value: 'all', label: t('tasks.all') },
              ...categories.filter(cat => cat.value !== 'all'),
            ]}
            value={filterCategory}
            onChange={e => onChangeFilterCategory(e.target.value)}
          />
        </div>
      )}

      {items.length === 0 ? (
        <div
          className="edition-section__empty"
          role="status"
          aria-live="polite"
        >
          💤 Aucune carte à afficher
        </div>
      ) : (
        <DndGrid
          items={items}
          onReorder={newItems => {
            if (onReorder) {
              onReorder(newItems.map(item => item.id))
            }
          }}
          renderItem={(item: CardItem) => (
            <EditionCard
              imageComponent={
                <SignedImage
                  filePath={item.image_url || ''}
                  bucket="personal-images"
                  alt={item.name}
                  className="img-size-sm"
                />
              }
              labelId={item.id}
              label={drafts[item.id] ?? item.name}
              onLabelChange={val => handleChange(item.id, val)}
              onBlur={val => handleBlur(item.id, val)}
              onDelete={() => onDelete(item)}
              checked={isCardInTimeline(item.id)}
              onToggleCheck={() => handleToggleCheckbox(item.id)}
              disabled={checkboxDisabled}
              categorie={item.categorie || ''}
              onCategorieChange={val => onUpdateCategorie(item.id, val)}
              categorieOptions={categories}
              className={[
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
          getItemId={(item: CardItem) => item.id}
        />
      )}

      <ModalAjout
        isOpen={modalCardOpen}
        onClose={() => setModalCardOpen(false)}
        includeCategory
        categories={categories}
        assetType="card_image"
        onSubmit={values => {
          onSubmitCard(values)
          setModalCardOpen(false)
        }}
      />

      <ModalCategory
        isOpen={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        categories={categories}
        onDeleteCategory={value => setCatASupprimer(value)}
        onAddCategory={handleAddCategory}
        newCategory={newCatLabel}
        onChangeNewCategory={setNewCatLabel}
        isSubmitting={isSubmittingCategory}
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
