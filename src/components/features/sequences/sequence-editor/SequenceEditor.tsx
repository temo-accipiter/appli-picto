'use client'

/**
 * SequenceEditor — Éditeur de séquence pour une carte mère (contexte Édition, adulte).
 *
 * UX cible :
 * - Un header clair avec la carte mère
 * - Une zone "Séquence en cours" qui reprend le modèle mental de composition
 * - Une bibliothèque unique à checkbox qui pilote la séquence
 *
 * ⚠️ RÈGLES DB-FIRST
 * - CRUD via useSequences + useSequenceSteps (jamais de query directe)
 * - Min 2 étapes imposé par trigger DB (DEFERRABLE) — le front anticipe pour UX
 * - UNIQUE(sequence_id, step_card_id) → doublon rejeté par DB
 * - La DB reste la source de vérité pour les refus d'écriture.
 *
 * ⚠️ SYSTÈME SÉQUENÇAGE
 * - Réutiliser le modèle mental de composition de timeline sans réutiliser
 *   la persistance des slots timeline.
 * - Les placeholders de slots dans cet éditeur sont purement visuels.
 */

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useEffect, useId, useMemo, useState } from 'react'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import type { Sequence } from '@/hooks/useSequences'
import { Button, Checkbox, SignedImage } from '@/components'
import useSequenceStepsWithVisitor from '@/hooks/useSequenceStepsWithVisitor'
import '@/components/shared/dnd/DndCard/DndCard.scss'
import './SequenceEditor.scss'

interface SequenceEditorProps {
  motherCardId: string
  motherCardLabel: string
  sequence: Sequence | null
  bankCards: BankCard[]
  personalCards: PersonalCard[]
  onCreateSequence: (
    motherCardId: string,
    stepCardIds: string[]
  ) => Promise<{ id: string | null; error: Error | null }>
  onDeleteSequence: (sequenceId: string) => Promise<{ error: Error | null }>
  canCreateSequence?: boolean
  creationAvailabilityLoading?: boolean
  isReadOnly?: boolean
}

type SequenceSelectableCard = (BankCard | PersonalCard) & {
  imageBucket: 'bank-images' | 'personal-images'
}

type ExistingComposerSlot = {
  slotId: string
  type: 'filled' | 'empty'
  stepId: string | null
  stepCardId: string | null
}

const MIN_VISIBLE_SLOTS = 2

function dbErrorToMessage(
  err: Error | null,
  action: 'create' | 'update' = 'update'
): string {
  if (!err) return ''
  const msg = err.message?.toLowerCase() ?? ''

  if (msg.includes('existe déjà') || msg.includes('already exists')) {
    return 'Une séquence existe déjà pour cette carte.'
  }

  if (
    msg.includes('permission') ||
    msg.includes('access') ||
    msg.includes('policy') ||
    msg.includes('denied')
  ) {
    return action === 'create'
      ? 'Impossible de créer la séquence pour le moment. Réessaie.'
      : 'Impossible de modifier la séquence pour le moment. Réessaie.'
  }

  if (msg.includes('min') && msg.includes('step')) {
    return 'La séquence doit avoir au moins 2 étapes.'
  }

  if (msg.includes('unique') || msg.includes('duplicate')) {
    return 'Cette carte est déjà dans la séquence.'
  }

  return 'Une erreur est survenue. Réessaie.'
}

function normalizeDraftSlots(
  nextSlots: Array<string | null>,
  visibleCount: number
): Array<string | null> {
  const selected = Array.from(
    new Set(nextSlots.filter((cardId): cardId is string => Boolean(cardId)))
  )
  const normalizedLength = Math.max(
    MIN_VISIBLE_SLOTS,
    visibleCount,
    selected.length
  )

  return [
    ...selected,
    ...Array.from(
      { length: Math.max(0, normalizedLength - selected.length) },
      () => null
    ),
  ]
}

function SequenceComposerSlot({
  slotId,
  index,
  card,
  imageBucket,
  isInteractive,
  isDragging,
  isDragTarget,
  onRemove,
}: {
  slotId: string
  index: number
  card: SequenceSelectableCard | null
  imageBucket: 'bank-images' | 'personal-images'
  isInteractive: boolean
  isDragging: boolean
  isDragTarget: boolean
  onRemove?: () => void
}) {
  const canDrag = isInteractive && Boolean(card)
  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
  } = useDraggable({
    id: slotId,
    disabled: !canDrag,
  })
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: slotId,
    disabled: !isInteractive,
  })

  return (
    <li
      ref={setDroppableRef}
      className={`sequence-editor__composer-slot${card ? ' sequence-editor__composer-slot--filled' : ' sequence-editor__composer-slot--empty'}`}
      data-dragging={isDragging || undefined}
      data-drag-over={isDragTarget || undefined}
    >
      <div className="sequence-editor__composer-slot-header">
        <span className="sequence-editor__composer-slot-label">
          Étape {index + 1}
        </span>
        {card && onRemove && (
          <button
            type="button"
            className="sequence-editor__slot-action"
            onClick={onRemove}
            aria-label={`Retirer ${card.name} de la séquence`}
          >
            Retirer
          </button>
        )}
      </div>

      {card ? (
        <div
          ref={setDraggableRef}
          {...attributes}
          {...listeners}
          className={
            canDrag
              ? `sequence-editor__composer-card dnd-card${isDragging ? ' dnd-card--dragging' : ''}`
              : 'sequence-editor__composer-card'
          }
          tabIndex={canDrag ? 0 : undefined}
          aria-label={
            canDrag
              ? `Glisser ${card.name} pour réorganiser la séquence`
              : undefined
          }
          aria-grabbed={canDrag ? isDragging : undefined}
        >
          {card.image_url ? (
            <SignedImage
              filePath={card.image_url}
              alt={card.name}
              bucket={imageBucket}
              className="sequence-editor__composer-image"
            />
          ) : (
            <div
              className="sequence-editor__composer-placeholder"
              aria-hidden="true"
            >
              📋
            </div>
          )}
          <span className="sequence-editor__composer-name">{card.name}</span>
        </div>
      ) : (
        <div className="sequence-editor__composer-empty" aria-hidden="true">
          <span className="sequence-editor__composer-empty-icon">+</span>
          <span className="sequence-editor__composer-empty-text">
            Coche une carte dans la bibliothèque
          </span>
        </div>
      )}
    </li>
  )
}

export function SequenceEditor({
  motherCardId,
  motherCardLabel,
  sequence,
  bankCards,
  personalCards,
  onCreateSequence,
  onDeleteSequence,
  canCreateSequence = false,
  creationAvailabilityLoading = false,
  isReadOnly = false,
}: SequenceEditorProps) {
  const checkboxIdBase = useId()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mutatingSteps, setMutatingSteps] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [draftSlots, setDraftSlots] = useState<Array<string | null>>([
    null,
    null,
  ])
  const [extraVisibleExistingSlots, setExtraVisibleExistingSlots] = useState(0)
  const [activeDragSlotId, setActiveDragSlotId] = useState<string | null>(null)
  const [overDragSlotId, setOverDragSlotId] = useState<string | null>(null)

  const {
    steps,
    loading: stepsLoading,
    error: stepsError,
    addStep,
    removeStep,
    moveStep,
  } = useSequenceStepsWithVisitor(sequence?.id ?? null)

  useEffect(() => {
    setActionError(null)
    setConfirmDelete(false)
    setDraftSlots([null, null])
    setExtraVisibleExistingSlots(0)
    setActiveDragSlotId(null)
    setOverDragSlotId(null)
  }, [motherCardId, sequence?.id])

  useEffect(() => {
    if (!stepsError) return
    setActionError('Impossible de charger la séquence. Réessaie.')
  }, [stepsError])

  const allCards: SequenceSelectableCard[] = useMemo(
    () => [
      ...bankCards.map(card => ({
        ...card,
        imageBucket: 'bank-images' as const,
      })),
      ...personalCards.map(card => ({
        ...card,
        imageBucket: 'personal-images' as const,
      })),
    ],
    [bankCards, personalCards]
  )

  const cardsById = useMemo(
    () =>
      new Map<string, SequenceSelectableCard>(
        allCards.map(card => [card.id, card] as const)
      ),
    [allCards]
  )

  const visibleExistingSlots: ExistingComposerSlot[] = useMemo(() => {
    const slots: ExistingComposerSlot[] = steps.map(step => ({
      slotId: `step-${step.id}`,
      type: 'filled',
      stepId: step.id,
      stepCardId: step.step_card_id,
    }))
    const total = Math.max(
      MIN_VISIBLE_SLOTS,
      steps.length + extraVisibleExistingSlots
    )

    while (slots.length < total) {
      slots.push({
        slotId: `empty-${slots.length}`,
        type: 'empty',
        stepId: null,
        stepCardId: null,
      })
    }

    return slots
  }, [extraVisibleExistingSlots, steps])

  const selectedDraftCardIds = useMemo(
    () => draftSlots.filter((cardId): cardId is string => Boolean(cardId)),
    [draftSlots]
  )
  const selectedExistingCardIds = useMemo(
    () => steps.map(step => step.step_card_id),
    [steps]
  )
  const selectedCardIds = sequence
    ? selectedExistingCardIds
    : selectedDraftCardIds
  const selectedCardIdSet = useMemo(
    () => new Set(selectedCardIds),
    [selectedCardIds]
  )
  const hasDraftEmptySlot = draftSlots.some(slotCardId => !slotCardId)
  const hasExistingEmptySlot = visibleExistingSlots.some(
    slot => slot.type === 'empty'
  )

  const isBusy = creating || deleting || mutatingSteps
  const isCreationLocked = !sequence && !canCreateSequence
  const libraryIsDisabled =
    isReadOnly || isBusy || creationAvailabilityLoading || isCreationLocked
  const canSubmitInitialSequence =
    !sequence &&
    canCreateSequence &&
    selectedDraftCardIds.length >= 2 &&
    !isBusy

  const handleCreate = async () => {
    if (!canSubmitInitialSequence) return

    setCreating(true)
    setActionError(null)
    const { error } = await onCreateSequence(motherCardId, selectedDraftCardIds)
    setCreating(false)
    if (error) setActionError(dbErrorToMessage(error, 'create'))
  }

  const handleDelete = async () => {
    if (!sequence) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setConfirmDelete(false)
    setDeleting(true)
    setActionError(null)
    const { error } = await onDeleteSequence(sequence.id)
    setDeleting(false)
    if (error) setActionError('Impossible de supprimer la séquence. Réessaie.')
  }

  const handleRemoveExistingStep = async (stepId: string) => {
    if (mutatingSteps) return

    setActionError(null)
    setMutatingSteps(true)
    try {
      const { error } = await removeStep(stepId)
      if (error) setActionError(dbErrorToMessage(error))
    } finally {
      setMutatingSteps(false)
    }
  }

  const handleToggleDraftCard = (cardId: string, shouldSelect: boolean) => {
    if (shouldSelect && !hasDraftEmptySlot) {
      setActionError("Ajoute d'abord un slot étape.")
      return
    }

    setActionError(null)
    setDraftSlots(current => {
      if (shouldSelect) {
        const firstEmptyIndex = current.findIndex(slotCardId => !slotCardId)
        if (firstEmptyIndex === -1) return current

        const next = [...current]
        next[firstEmptyIndex] = cardId
        return normalizeDraftSlots(next, current.length)
      }

      return normalizeDraftSlots(
        current.filter(currentCardId => currentCardId !== cardId),
        current.length
      )
    })
  }

  const handleToggleExistingCard = async (
    cardId: string,
    shouldSelect: boolean
  ) => {
    if (!sequence || mutatingSteps) return

    if (shouldSelect && !hasExistingEmptySlot) {
      setActionError("Ajoute d'abord un slot étape.")
      return
    }

    setActionError(null)
    setMutatingSteps(true)
    try {
      if (shouldSelect) {
        const { error } = await addStep(cardId)
        if (error) setActionError(dbErrorToMessage(error))
        if (!error) {
          setExtraVisibleExistingSlots(current => Math.max(0, current - 1))
        }
        return
      }

      const existingStep = steps.find(step => step.step_card_id === cardId)
      if (!existingStep) return

      const { error } = await removeStep(existingStep.id)
      if (error) setActionError(dbErrorToMessage(error))
    } finally {
      setMutatingSteps(false)
    }
  }

  const handleLibraryToggle = async (
    cardId: string,
    currentlySelected: boolean
  ) => {
    if (libraryIsDisabled) return

    if (sequence) {
      await handleToggleExistingCard(cardId, !currentlySelected)
      return
    }

    handleToggleDraftCard(cardId, !currentlySelected)
  }

  const handleAddVisualSlot = () => {
    if (sequence) {
      setExtraVisibleExistingSlots(current => current + 1)
      return
    }

    setDraftSlots(current =>
      normalizeDraftSlots([...current, null], current.length + 1)
    )
  }

  const handleRemoveDraftSlot = (slotIndex: number) => {
    setDraftSlots(current =>
      normalizeDraftSlots(
        current.map((cardId, index) => (index === slotIndex ? null : cardId)),
        current.length
      )
    )
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragSlotId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverDragSlotId(event.over?.id ? String(event.over.id) : null)
  }

  const moveDraftCard = (sourceSlotId: string, targetSlotId: string) => {
    const sourceIndex = Number(sourceSlotId.replace('draft-', ''))
    const targetIndex = Number(targetSlotId.replace('draft-', ''))
    if (Number.isNaN(sourceIndex) || Number.isNaN(targetIndex)) return

    setDraftSlots(current => {
      const selectedIds = current.filter((cardId): cardId is string =>
        Boolean(cardId)
      )
      const sourceCardId = current[sourceIndex]
      if (!sourceCardId) return current

      const sourceSelectedIndex = selectedIds.findIndex(
        id => id === sourceCardId
      )
      if (sourceSelectedIndex === -1) return current

      const targetCardId = current[targetIndex]
      const targetSelectedIndex = targetCardId
        ? selectedIds.findIndex(id => id === targetCardId)
        : selectedIds.length - 1
      if (targetSelectedIndex === -1) return current

      const reordered = [...selectedIds]
      const [movedCardId] = reordered.splice(sourceSelectedIndex, 1)
      if (!movedCardId) return current
      reordered.splice(targetSelectedIndex, 0, movedCardId)

      return normalizeDraftSlots(reordered, current.length)
    })
  }

  const moveExistingCard = async (
    sourceSlotId: string,
    targetSlotId: string
  ) => {
    if (mutatingSteps) return

    const sourceIndex = visibleExistingSlots.findIndex(
      slot => slot.slotId === sourceSlotId && slot.stepId
    )
    const targetIndex = visibleExistingSlots.findIndex(
      slot => slot.slotId === targetSlotId
    )
    if (sourceIndex === -1 || targetIndex === -1) return

    const sourceSlot = visibleExistingSlots[sourceIndex]
    if (!sourceSlot) return
    if (!sourceSlot.stepId) return

    const boundedTargetIndex = Math.min(targetIndex, steps.length - 1)
    if (boundedTargetIndex === sourceIndex) return

    setActionError(null)
    setMutatingSteps(true)
    try {
      const { error } = await moveStep(sourceSlot.stepId, boundedTargetIndex)
      if (error) {
        setActionError("Impossible de déplacer l'étape. Réessaie.")
      }
    } finally {
      setMutatingSteps(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragSlotId(null)
    setOverDragSlotId(null)
    const sourceSlotId = String(event.active.id)
    const targetSlotId = event.over?.id ? String(event.over.id) : null
    if (!targetSlotId || sourceSlotId === targetSlotId || isReadOnly) return

    if (sequence) {
      await moveExistingCard(sourceSlotId, targetSlotId)
      return
    }

    moveDraftCard(sourceSlotId, targetSlotId)
  }

  const librarySections = useMemo(
    () =>
      [
        {
          title: 'Cartes banque',
          cards: allCards.filter(card => card.imageBucket === 'bank-images'),
        },
        {
          title: 'Mes cartes',
          cards: allCards.filter(
            card => card.imageBucket === 'personal-images'
          ),
        },
      ].filter(section => section.cards.length > 0),
    [allCards]
  )

  const isComposerReadOnly = libraryIsDisabled
  const composerHint = sequence
    ? 'Coche une carte pour l’ajouter, décoche-la pour la retirer, puis réorganise si besoin.'
    : 'Compose la séquence avec au moins 2 cartes, puis crée-la.'

  return (
    <div
      className={`sequence-editor${isReadOnly ? ' sequence-editor--readonly' : ''}${!sequence ? ' sequence-editor--empty' : ''}`}
    >
      <header className="sequence-editor__header">
        <div className="sequence-editor__header-content">
          <h3 className="sequence-editor__title">
            Séquence de &quot;{motherCardLabel}&quot;
          </h3>
          <p className="sequence-editor__hint">{composerHint}</p>
        </div>

        {sequence && !isReadOnly && (
          <div className="sequence-editor__header-actions">
            <Button
              variant="danger"
              className={confirmDelete ? 'sequence-editor__delete-confirm' : ''}
              onClick={handleDelete}
              disabled={isBusy}
              isLoading={deleting}
              aria-label={
                confirmDelete
                  ? 'Confirmer la suppression de la séquence'
                  : 'Supprimer la séquence'
              }
              label={
                confirmDelete
                  ? 'Confirmer la suppression ?'
                  : 'Supprimer la séquence'
              }
            />
            {confirmDelete && (
              <Button
                variant="default"
                onClick={() => setConfirmDelete(false)}
                disabled={isBusy}
                label="Annuler"
              />
            )}
          </div>
        )}
      </header>

      {isReadOnly && (
        <p className="sequence-editor__readonly-notice">
          Lecture seule pour le moment.
        </p>
      )}

      {!sequence && creationAvailabilityLoading && (
        <div className="sequence-editor__loading" aria-busy="true">
          <span className="sr-only">
            Chargement de la disponibilité du séquençage…
          </span>
        </div>
      )}

      {!sequence && !creationAvailabilityLoading && !canCreateSequence && (
        <p className="sequence-editor__readonly-notice">
          La création de séquence n&apos;est pas disponible pour le moment sur
          ce compte.
        </p>
      )}

      {actionError && (
        <p className="sequence-editor__error" role="alert">
          {actionError}
        </p>
      )}

      <section className="sequence-editor__section">
        <div className="sequence-editor__section-header">
          <div>
            <h4 className="sequence-editor__section-title">
              Séquence en cours
            </h4>
            <p className="sequence-editor__section-hint">
              Glisse une carte pour changer son ordre.
            </p>
          </div>

          {!isReadOnly &&
            (sequence || canCreateSequence) &&
            !creationAvailabilityLoading && (
              <Button
                variant="default"
                onClick={handleAddVisualSlot}
                disabled={isBusy}
                label="+ Ajouter un slot étape"
              />
            )}
        </div>

        {sequence && stepsLoading ? (
          <div className="sequence-editor__loading" aria-busy="true">
            <span className="sr-only">Chargement des étapes…</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <ol
              className="sequence-editor__composer"
              aria-label="Séquence en cours"
            >
              {sequence
                ? visibleExistingSlots.map((slot, index) => {
                    const card = slot.stepCardId
                      ? (cardsById.get(slot.stepCardId) ?? null)
                      : null

                    return (
                      <SequenceComposerSlot
                        key={slot.slotId}
                        slotId={slot.slotId}
                        index={index}
                        card={card}
                        imageBucket={card?.imageBucket ?? 'bank-images'}
                        isInteractive={!isComposerReadOnly && !isBusy}
                        isDragging={activeDragSlotId === slot.slotId}
                        isDragTarget={overDragSlotId === slot.slotId}
                        {...(slot.stepId && card && !isReadOnly
                          ? {
                              onRemove: () =>
                                void handleRemoveExistingStep(slot.stepId!),
                            }
                          : {})}
                      />
                    )
                  })
                : draftSlots.map((cardId, index) => {
                    const card =
                      typeof cardId === 'string'
                        ? (cardsById.get(cardId) ?? null)
                        : null

                    return (
                      <SequenceComposerSlot
                        key={`draft-${index}`}
                        slotId={`draft-${index}`}
                        index={index}
                        card={card}
                        imageBucket={card?.imageBucket ?? 'bank-images'}
                        isInteractive={!isComposerReadOnly}
                        isDragging={activeDragSlotId === `draft-${index}`}
                        isDragTarget={overDragSlotId === `draft-${index}`}
                        {...(card && !isReadOnly
                          ? { onRemove: () => handleRemoveDraftSlot(index) }
                          : {})}
                      />
                    )
                  })}
            </ol>
          </DndContext>
        )}

        {!sequence && selectedDraftCardIds.length < 2 && (
          <p className="sequence-editor__empty" role="status">
            Sélectionne au moins 2 cartes pour créer la séquence.
          </p>
        )}

        {!sequence && canCreateSequence && !creationAvailabilityLoading && (
          <div className="sequence-editor__footer">
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={!canSubmitInitialSequence}
              isLoading={creating}
              label="Créer la séquence"
            />
          </div>
        )}
      </section>

      <section className="sequence-editor__section">
        <div className="sequence-editor__section-header">
          <div>
            <h4 className="sequence-editor__section-title">Bibliothèque</h4>
            <p className="sequence-editor__section-hint">
              Une carte cochée apparaît une seule fois dans la séquence.
            </p>
          </div>
        </div>

        {librarySections.length === 0 ? (
          <p className="sequence-editor__empty">
            Aucune carte disponible pour cette séquence.
          </p>
        ) : (
          <div className="sequence-editor__library-sections">
            {librarySections.map(section => (
              <div
                key={section.title}
                className="sequence-editor__library-group"
              >
                <h5 className="sequence-editor__library-title">
                  {section.title}
                </h5>
                <div className="sequence-editor__library" role="list">
                  {section.cards.map(card => {
                    const isSelected = selectedCardIdSet.has(card.id)

                    return (
                      <label
                        key={card.id}
                        className={`sequence-editor__library-card${isSelected ? ' sequence-editor__library-card--selected' : ''}${libraryIsDisabled ? ' sequence-editor__library-card--disabled' : ''}`}
                      >
                        <Checkbox
                          id={`${checkboxIdBase}-${card.id}`}
                          checked={isSelected}
                          onChange={() =>
                            void handleLibraryToggle(card.id, isSelected)
                          }
                          disabled={libraryIsDisabled}
                          className="sequence-editor__library-checkbox"
                          aria-label={`${isSelected ? 'Retirer' : 'Ajouter'} ${card.name} dans la séquence`}
                        />

                        <div className="sequence-editor__library-visual">
                          {card.image_url ? (
                            <SignedImage
                              filePath={card.image_url}
                              alt={card.name}
                              bucket={card.imageBucket}
                              className="sequence-editor__library-image"
                            />
                          ) : (
                            <div
                              className="sequence-editor__library-placeholder"
                              aria-hidden="true"
                            >
                              📋
                            </div>
                          )}
                          <span className="sequence-editor__library-name">
                            {card.name}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default SequenceEditor
