'use client'

import {
  Button,
  EditionCard,
  ModalAjout,
  SignedImage,
  DndGrid,
} from '@/components'
import { useI18n } from '@/hooks'
import React, { useState, useCallback, useRef } from 'react'
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
  const [drafts, setDrafts] = useState<Record<string | number, string>>({})
  const [errors, setErrors] = useState<Record<string | number, string>>({})
  const [successIds, setSuccessIds] = useState(new Set<string | number>())
  const [announcement, setAnnouncement] = useState('')
  const announcementRef = useRef<NodeJS.Timeout | null>(null)

  const { t } = useI18n()

  const validateLabel = (label: string): string => {
    const trimmed = label.trim()
    if (!trimmed || trimmed !== label || /\s{2,}/.test(label)) {
      return t('rewards.invalidName')
    }
    return ''
  }

  const handleChange = (id: string | number, value: string) => {
    setDrafts(prev => ({ ...prev, [id]: value }))
    setErrors(prev => ({ ...prev, [id]: '' }))
  }

  const handleBlur = async (id: string | number, value: string) => {
    const error = validateLabel(value)
    if (error) {
      setErrors(prev => ({ ...prev, [id]: error }))
      return
    }

    // Attendre le résultat de la mise à jour
    const result = await onLabelChange(id, value)

    // Le toast est déjà géré dans le hook useRecompenses.updateLabel
    // On ne fait que gérer l'état local du composant

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

    // Afficher l'indicateur de succès seulement si pas d'erreur
    if (!result?.error) {
      setSuccessIds(prev => new Set([...prev, id]))
      setTimeout(() => {
        setSuccessIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 600)
    }
  }

  const handleDragEndAnnouncement = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (announcementRef.current) clearTimeout(announcementRef.current)
      if (fromIndex === toIndex) {
        setAnnouncement('Déplacement annulé')
        return
      }

      const movedReward = items[fromIndex]
      const swappedReward = items[toIndex]

      if (!movedReward) return

      if (swappedReward) {
        setAnnouncement(
          `"${movedReward.label}" échangé avec "${swappedReward.label}"`
        )
      } else {
        setAnnouncement(`"${movedReward.label}" déplacé`)
      }

      announcementRef.current = setTimeout(() => {
        setAnnouncement('')
      }, 3000)
    },
    [items]
  )

  return (
    <div className="checklist-recompenses">
      {/* WCAG 4.1.3 - Région d'annonces pour lecteur d'écran */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

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
