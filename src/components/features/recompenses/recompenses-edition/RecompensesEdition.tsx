'use client'

import { Button, EditionCard, ModalAjout, SignedImage } from '@/components'
import { useI18n } from '@/hooks'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
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

// Génère les IDs de slots
const generateSlots = (count: number) =>
  Array.from({ length: count }, (_, i) => `reward-slot${i}`)

// Composant DroppableSlot pour les récompenses
interface DroppableSlotProps {
  id: string
  children?: React.ReactNode
}

function DroppableSlot({ id, children }: DroppableSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`edition-slot${isOver ? ' over' : ''}`}>
      {children}
    </div>
  )
}

// Composant DraggableCard wrapper
interface DraggableCardProps {
  id: string
  children: React.ReactNode
  isDraggingGlobal: boolean
  isBeingSwapped?: boolean
}

function DraggableCard({
  id,
  children,
  isDraggingGlobal,
  isBeingSwapped,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id })
  const [dragPhase, setDragPhase] = useState<
    'idle' | 'lifting' | 'shrinking' | 'growing' | 'moving'
  >('idle')
  const [swapPhase, setSwapPhase] = useState<'idle' | 'shrinking' | 'growing'>(
    'idle'
  )

  // Gérer les phases d'animation avec timing plus lent et visible
  useEffect(() => {
    if (isDragging) {
      // Phase 1: Soulèvement rapide avec léger agrandissement
      setDragPhase('lifting')

      // Phase 2: Rétrécissement marqué (après 120ms)
      const shrinkTimer = setTimeout(() => {
        setDragPhase('shrinking')
      }, 120)

      // Phase 3: Début du retour à la normale (après 500ms)
      const growTimer = setTimeout(() => {
        setDragPhase('growing')
      }, 500)

      // Phase 4: Taille finale de déplacement (après 900ms)
      const moveTimer = setTimeout(() => {
        setDragPhase('moving')
      }, 900)

      return () => {
        clearTimeout(shrinkTimer)
        clearTimeout(growTimer)
        clearTimeout(moveTimer)
      }
    } else {
      setDragPhase('idle')
    }
  }, [isDragging])

  // Gérer l'animation de swap pour la card échangée
  useEffect(() => {
    if (isBeingSwapped) {
      setSwapPhase('shrinking')
      const growTimer = setTimeout(() => {
        setSwapPhase('growing')
      }, 500)
      return () => clearTimeout(growTimer)
    } else {
      setSwapPhase('idle')
    }
  }, [isBeingSwapped])

  const pointerEvents: 'none' | 'auto' =
    isDraggingGlobal && !isDragging ? 'none' : 'auto'

  // Scale et rotation selon la phase de drag
  const getTransformValues = () => {
    // Animation de swap prioritaire si pas en train de drag
    if (!isDragging && swapPhase !== 'idle') {
      switch (swapPhase) {
        case 'shrinking':
          return { scale: 0.8, rotate: -3, y: -10 }
        case 'growing':
          return { scale: 1, rotate: 0, y: 0 }
        default:
          return { scale: 1, rotate: 0, y: 0 }
      }
    }
    switch (dragPhase) {
      case 'lifting':
        return { scale: 1.05, rotate: -2, y: -8 }
      case 'shrinking':
        return { scale: 0.75, rotate: 3, y: -15 }
      case 'growing':
        return { scale: 0.9, rotate: -1, y: -10 }
      case 'moving':
        return { scale: 1.03, rotate: 0, y: 0 }
      default:
        return { scale: 1, rotate: 0, y: 0 }
    }
  }

  const { scale, rotate, y } = getTransformValues()

  // Construire le transform avec ou sans déplacement
  const buildTransform = () => {
    if (transform) {
      return `translate(${transform.x}px, ${transform.y + y}px) scale(${scale}) rotate(${rotate}deg)`
    }
    if (isDragging || swapPhase !== 'idle') {
      return `translateY(${y}px) scale(${scale}) rotate(${rotate}deg)`
    }
    return undefined
  }

  // Durée de transition selon la phase (plus lent pour être visible)
  const getTransitionDuration = () => {
    // Animation de swap
    if (!isDragging && swapPhase !== 'idle') {
      return swapPhase === 'shrinking' ? '400ms' : '600ms'
    }
    switch (dragPhase) {
      case 'lifting':
        return '120ms'
      case 'shrinking':
        return '350ms'
      case 'growing':
        return '400ms'
      case 'moving':
        return '500ms'
      default:
        return '250ms'
    }
  }

  const style: React.CSSProperties = {
    transform: buildTransform(),
    transition: `transform ${getTransitionDuration()} cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow ${getTransitionDuration()} ease-out, opacity 150ms ease`,
    touchAction: 'manipulation' as const,
    pointerEvents,
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.92 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    boxShadow: isDragging
      ? '0 20px 40px rgba(0, 0, 0, 0.3), 0 10px 15px rgba(0, 0, 0, 0.2)'
      : undefined,
    willChange: isDragging ? 'transform' : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
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
  const [isDragging, setIsDragging] = useState(false)
  const [layout, setLayout] = useState<Record<string, string | null>>({})
  const [announcement, setAnnouncement] = useState('')
  const [swappedCardId, setSwappedCardId] = useState<string | null>(null)
  const prevItemIdsRef = useRef<string>('')

  const { t } = useI18n()

  // Sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Synchroniser le layout quand les items changent
  useEffect(() => {
    const currentIds = items
      .map(item => item.id.toString())
      .sort()
      .join(',')

    if (currentIds !== prevItemIdsRef.current) {
      prevItemIdsRef.current = currentIds
      const newLayout: Record<string, string | null> = {}
      items.forEach((item, index) => {
        newLayout[`reward-slot${index}`] = item.id.toString()
      })
      setLayout(newLayout)
    }
  }, [items])

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setIsDragging(true)
      const reward = items.find(r => r.id.toString() === active.id)
      if (reward) {
        setAnnouncement(`Déplacement de "${reward.label}"`)
      }
    },
    [items]
  )

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) {
        setIsDragging(false)
        setAnnouncement('Déplacement annulé')
        return
      }

      const activeId = active.id as string
      const overId = over.id as string

      const fromSlot = Object.keys(layout).find(key => layout[key] === activeId)
      let toSlot = overId
      if (!overId.startsWith('reward-slot')) {
        toSlot =
          Object.keys(layout).find(key => layout[key] === overId) || overId
      }

      if (!fromSlot || fromSlot === toSlot) {
        setIsDragging(false)
        return
      }

      const cardAtDestination = layout[toSlot]

      // Déclencher l'animation de swap sur la card échangée
      if (cardAtDestination) {
        setSwappedCardId(cardAtDestination)
        setTimeout(() => {
          setSwappedCardId(null)
        }, 1100) // Durée totale de l'animation de swap (500ms + 600ms)
      }

      setLayout(prev => {
        const newLayout = { ...prev }
        newLayout[fromSlot] = cardAtDestination ?? null
        newLayout[toSlot] = activeId
        return newLayout
      })

      // Reconstruire l'ordre et appeler onReorder
      if (onReorder) {
        const newOrder = generateSlots(items.length)
          .map(slotId => {
            if (slotId === fromSlot) return cardAtDestination
            if (slotId === toSlot) return activeId
            return layout[slotId]
          })
          .filter((id): id is string => id !== null)
        onReorder(newOrder)
      }

      const movedReward = items.find(r => r.id.toString() === activeId)
      const swappedReward = cardAtDestination
        ? items.find(r => r.id.toString() === cardAtDestination)
        : null

      if (swappedReward) {
        setAnnouncement(
          `"${movedReward?.label}" échangé avec "${swappedReward.label}"`
        )
      } else {
        setAnnouncement(`"${movedReward?.label}" déplacé`)
      }

      setTimeout(() => {
        setIsDragging(false)
      }, 100)
    },
    [layout, items, onReorder]
  )

  const slots = generateSlots(items.length)

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

      <h2 className="edition-section__title">{`🎁 ${t('rewards.toEdit')}`}</h2>

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="edition-section__grid">
          {items.length === 0 ? (
            <div
              className="edition-section__empty"
              role="status"
              aria-live="polite"
            >
              💤 {t('rewards.noRewardsToDisplay')}
            </div>
          ) : (
            slots.map(slotId => {
              const cardId = layout[slotId]
              const reward = cardId
                ? items.find(item => item.id.toString() === cardId)
                : null

              return (
                <DroppableSlot key={slotId} id={slotId}>
                  {reward && (
                    <DraggableCard
                      id={reward.id.toString()}
                      isDraggingGlobal={isDragging}
                      isBeingSwapped={swappedCardId === reward.id.toString()}
                    >
                      <EditionCard
                        imageComponent={
                          <SignedImage
                            filePath={reward.imagepath || ''}
                            bucket="images"
                            alt={reward.label}
                            className="img-size-sm"
                          />
                        }
                        label={drafts[reward.id] ?? reward.label}
                        labelId={reward.id}
                        onLabelChange={val => handleChange(reward.id, val)}
                        onBlur={val => handleBlur(reward.id, val)}
                        onDelete={() => onDelete(reward)}
                        checked={
                          reward.selected === true || reward.selected === 1
                        }
                        onToggleCheck={() =>
                          onToggleSelect(
                            reward.id,
                            reward.selected === true || reward.selected === 1
                          )
                        }
                        categorieOptions={[]}
                        className={[
                          reward.selected === 1 ? 'active' : '',
                          'card-reward',
                          errors[reward.id] ? 'input-field__input--error' : '',
                          successIds.has(reward.id)
                            ? 'input-field__input--success'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      />
                    </DraggableCard>
                  )}
                </DroppableSlot>
              )
            })
          )}
        </div>
      </DndContext>

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
