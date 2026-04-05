'use client'

import {
  Button,
  EditionCard,
  ModalAjout,
  SignedImage,
  DndGrid,
} from '@/components'
import { useEditionState, useI18n } from '@/hooks'
import React, { useState } from 'react'
import './RecompensesEdition.scss'

interface RewardItem {
  id: string | number
  label: string
  imagepath?: string
  selected?: boolean | number
  position?: number
}

interface RewardFormData {
  label: string
  image: File
}

interface RecompensesEditionProps {
  items: RewardItem[]
  onDelete: (item: RewardItem) => void
  onToggleSelect: (id: string | number, currentSelected: boolean) => void
  onLabelChange: (
    id: string | number,
    label: string
  ) => Promise<{ error?: Error }>
  onSubmitReward: (data: RewardFormData) => void
  onShowQuotaModal?: (type: string) => Promise<boolean>
  onReorder?: (ids: (string | number)[]) => void
}

export default function RecompensesEdition({
  items,
  onDelete,
  onToggleSelect,
  onLabelChange,
  onSubmitReward,
  onShowQuotaModal,
  onReorder,
}: RecompensesEditionProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const { t } = useI18n()

  const {
    drafts,
    errors,
    successIds,
    handleChange,
    validateLabel,
    clearDraft,
    clearError,
    setError,
    triggerSuccess,
  } = useEditionState({
    validationErrorMessage: t('rewards.invalidName'),
    successDuration: 600,
  })

  const handleBlur = async (id: string | number, value: string) => {
    const err = validateLabel(value)
    if (err) {
      setError(id, err)
      return
    }

    // Attendre le résultat de la mise à jour
    const result = await onLabelChange(id, value)

    // Draft toujours nettoyé (même si erreur Supabase)
    clearDraft(id)
    clearError(id)

    // Afficher l'indicateur de succès seulement si pas d'erreur
    if (!result?.error) triggerSuccess(id)
  }

  return (
    <div className="checklist-recompenses">
      <div className="edition-section__actions">
        <Button
          label={`🏱 ${t('rewards.addReward')}`}
          onClick={async () => {
            if (onShowQuotaModal) {
              const canOpen = await onShowQuotaModal('reward')
              if (canOpen) {
                setModalOpen(true)
              }
            } else {
              setModalOpen(true)
            }
          }}
        />
      </div>

      {items.length === 0 ? (
        <div
          className="edition-section__empty"
          role="status"
          aria-live="polite"
        >
          💤 {t('rewards.noRewardsToDisplay')}
        </div>
      ) : (
        <DndGrid
          items={items}
          onReorder={newItems => {
            if (onReorder) {
              onReorder(newItems.map(item => item.id))
            }
          }}
          renderItem={(item: RewardItem) => (
            <EditionCard
              imageComponent={
                <SignedImage
                  filePath={item.imagepath || ''}
                  bucket="images"
                  alt={item.label}
                  className="img-size-sm"
                />
              }
              label={drafts[item.id] ?? item.label}
              labelId={item.id}
              onLabelChange={val => handleChange(item.id, val)}
              onBlur={val => handleBlur(item.id, val)}
              onDelete={() => onDelete(item)}
              checked={item.selected === true || item.selected === 1}
              onToggleCheck={() =>
                onToggleSelect(
                  item.id,
                  item.selected === true || item.selected === 1
                )
              }
              categorieOptions={[]}
              className={[
                item.selected === 1 ? 'active' : '',
                'card-reward',
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
          getItemId={(item: RewardItem) => item.id}
        />
      )}

      <ModalAjout
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        includeCategory={false}
        onSubmit={values => {
          onSubmitReward(values)
          setModalOpen(false)
        }}
      />
    </div>
  )
}
