'use client'

/**
 * SequenceEditor — Éditeur de séquence pour une carte mère (contexte Édition, adulte).
 *
 * Permet à l'adulte (statuts autorisés par la source produit prioritaire) de :
 * - Créer une séquence liée à une carte
 * - Ajouter/supprimer des étapes (cartes)
 * - Réordonner les étapes (flèches haut/bas)
 * - Supprimer la séquence entière
 *
 * ⚠️ RÈGLES DB-FIRST
 * - CRUD via useSequences + useSequenceSteps (jamais de query directe)
 * - Min 2 étapes imposé par trigger DB (DEFERRABLE) — le front anticipe pour UX
 * - UNIQUE(sequence_id, step_card_id) → doublon rejeté par DB
 * - La DB reste la source de vérité pour les refus d'écriture.
 * - isReadOnly : mitigation UX uniquement si un état applicatif externe impose
 *   une lecture seule locale. Ne pas l'utiliser comme paywall implicite.
 *
 * ⚠️ RÈGLES TSA
 * - Interface simple, prévisible, sans surprise.
 * - Suppression séquence : confirmation inline 1 clic (pas de modale).
 * - Messages d'erreur neutres, non techniques.
 * - Cibles tactiles ≥ 44px.
 *
 * ⚠️ SYSTÈME SÉQUENÇAGE — DISTINCT DU PLANNING ET DES JETONS
 * - Ne jamais mélanger les slots de timeline avec les étapes de séquence.
 * - Le composant est autonome : il gère ses propres hooks.
 */

import { useState, useEffect } from 'react'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import type { Sequence } from '@/hooks/useSequences'
import { SignedImage } from '@/components'
import useSequenceStepsWithVisitor from '@/hooks/useSequenceStepsWithVisitor'
import './SequenceEditor.scss'

interface SequenceEditorProps {
  /** Carte mère à laquelle est rattachée cette séquence */
  motherCardId: string
  /** Libellé de la carte mère (pour l'en-tête) */
  motherCardLabel: string
  /** Séquence existante (null = à créer) */
  sequence: Sequence | null
  /** Cartes banque disponibles (pour ajouter des étapes) */
  bankCards: BankCard[]
  /** Cartes personnelles disponibles (pour ajouter des étapes) */
  personalCards: PersonalCard[]
  /** Créer une séquence → retourne l'id créé */
  onCreateSequence: (
    motherCardId: string,
    stepCardIds: string[]
  ) => Promise<{ id: string | null; error: Error | null }>
  /** Supprimer la séquence entière */
  onDeleteSequence: (sequenceId: string) => Promise<{ error: Error | null }>
  /**
   * Le CTA de création ne doit être affiché que si la source active
   * permet réellement la création dans le contrat courant.
   */
  canCreateSequence?: boolean
  /** Chargement de la capacité d'écriture séquençage côté compte cloud. */
  creationAvailabilityLoading?: boolean
  /**
   * Lecture seule — mitigation UX pure.
   * La garde principale reste can_write_sequences() côté SQL/RLS.
   * Le parent fournit ce booléen dérivé de l'état applicatif déjà disponible.
   * Ne jamais fusionner Visitor (local-only) avec Free dans cette prop.
   */
  isReadOnly?: boolean
}

type SequenceSelectableCard = (BankCard | PersonalCard) & {
  imageBucket: 'bank-images' | 'personal-images'
}

/** Traduit une erreur DB en message UX neutre */
function dbErrorToMessage(
  err: Error | null,
  action: 'create' | 'update' = 'update'
): string {
  if (!err) return ''
  const msg = err.message?.toLowerCase() ?? ''

  // ── Erreurs création séquence ──────────────────────────────────────────────
  // UNIQUE constraint violation sur mother_card_id (1 séquence par carte max)
  if (msg.includes('existe déjà') || msg.includes('already exists')) {
    return 'Une séquence existe déjà pour cette carte.'
  }

  // Refus backend/RLS : ne pas présenter cela comme un paywall produit
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

  // ── Erreurs manipulation étapes ────────────────────────────────────────────
  // Contrainte min 2 étapes (trigger DEFERRABLE)
  if (msg.includes('min') && msg.includes('step')) {
    return 'La séquence doit avoir au moins 2 étapes.'
  }

  // UNIQUE constraint violation sur step_card_id (pas de doublon)
  if (msg.includes('unique') || msg.includes('duplicate')) {
    return 'Cette carte est déjà dans la séquence.'
  }

  // ── Erreur générique ───────────────────────────────────────────────────────
  return 'Une erreur est survenue. Réessaie.'
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
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mutatingSteps, setMutatingSteps] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [initialStepCardIds, setInitialStepCardIds] = useState<string[]>([
    '',
    '',
  ])

  // Étapes de la séquence (vide si pas encore créée)
  // Visitor → IndexedDB local-only, Auth → Supabase cloud
  const {
    steps,
    loading: stepsLoading,
    error: stepsError,
    addStep,
    removeStep,
    moveStep,
  } = useSequenceStepsWithVisitor(sequence?.id ?? null)

  // ── Reset actionError sur changement de contexte ───────────────────────────
  // Évite rémanence d'erreur quand l'utilisateur change de carte assignée
  // ou quand une séquence est créée/supprimée (sequence?.id change)
  useEffect(() => {
    setActionError(null)
    setInitialStepCardIds(['', ''])
  }, [motherCardId, sequence?.id])

  useEffect(() => {
    if (!stepsError) return
    setActionError('Impossible de charger la séquence. Réessaie.')
  }, [stepsError])

  // ── Création de la séquence ─────────────────────────────────────────────────
  const handleCreate = async () => {
    const selectedInitialStepIds = initialStepCardIds.filter(Boolean)
    setCreating(true)
    setActionError(null)
    const { error } = await onCreateSequence(
      motherCardId,
      selectedInitialStepIds
    )
    setCreating(false)
    if (error) setActionError(dbErrorToMessage(error, 'create'))
  }

  // ── Suppression de la séquence ──────────────────────────────────────────────
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

  // ── Ajout d'une étape ───────────────────────────────────────────────────────
  const handleAddStep = async (stepCardId: string) => {
    if (!stepCardId || !sequence || mutatingSteps) return
    setActionError(null)
    setMutatingSteps(true)
    try {
      const { error } = await addStep(stepCardId)
      if (error) setActionError(dbErrorToMessage(error))
    } finally {
      setMutatingSteps(false)
    }
  }

  // ── Suppression d'une étape ─────────────────────────────────────────────────
  const handleRemoveStep = async (stepId: string) => {
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

  // ── Déplacement d'une étape ─────────────────────────────────────────────────
  const handleMoveUp = async (stepId: string, currentPosition: number) => {
    if (currentPosition === 0 || mutatingSteps) return
    setActionError(null)
    setMutatingSteps(true)
    try {
      const { error } = await moveStep(stepId, currentPosition - 1)
      if (error) setActionError("Impossible de déplacer l'étape. Réessaie.")
    } finally {
      setMutatingSteps(false)
    }
  }

  const handleMoveDown = async (stepId: string, currentPosition: number) => {
    if (currentPosition >= steps.length - 1 || mutatingSteps) return
    setActionError(null)
    setMutatingSteps(true)
    try {
      const { error } = await moveStep(stepId, currentPosition + 1)
      if (error) setActionError("Impossible de déplacer l'étape. Réessaie.")
    } finally {
      setMutatingSteps(false)
    }
  }

  // Toutes les cartes disponibles (banque + perso) sauf celles déjà dans la séquence
  const allCards: SequenceSelectableCard[] = [
    ...bankCards.map(card => ({
      ...card,
      imageBucket: 'bank-images' as const,
    })),
    ...personalCards.map(card => ({
      ...card,
      imageBucket: 'personal-images' as const,
    })),
  ]
  const usedCardIds = new Set(steps.map(s => s.step_card_id))
  const availableBankCards: SequenceSelectableCard[] = bankCards
    .filter(c => !usedCardIds.has(c.id))
    .map(card => ({ ...card, imageBucket: 'bank-images' as const }))
  const availablePersonalCards: SequenceSelectableCard[] = personalCards
    .filter(c => !usedCardIds.has(c.id))
    .map(card => ({ ...card, imageBucket: 'personal-images' as const }))
  const hasAvailableCards =
    availableBankCards.length > 0 || availablePersonalCards.length > 0

  const isBusy = creating || deleting || mutatingSteps
  const selectedInitialStepIds = initialStepCardIds.filter(Boolean)
  const canSubmitInitialSequence =
    selectedInitialStepIds.length >= 2 &&
    new Set(selectedInitialStepIds).size === selectedInitialStepIds.length

  const getInitialOptions = (index: number) => {
    const otherSelectedIds = new Set(
      initialStepCardIds.filter(
        (stepCardId, currentIndex) =>
          currentIndex !== index && Boolean(stepCardId)
      )
    )

    return allCards.filter(card => !otherSelectedIds.has(card.id))
  }

  const handleInitialStepChange = (index: number, value: string) => {
    setInitialStepCardIds(current =>
      current.map((stepCardId, currentIndex) =>
        currentIndex === index ? value : stepCardId
      )
    )
  }

  const renderCardButton = ({
    card,
    onClick,
    disabled = false,
    isSelected = false,
    actionLabel,
  }: {
    card: SequenceSelectableCard
    onClick: () => void
    disabled?: boolean
    isSelected?: boolean
    actionLabel: string
  }) => (
    <button
      key={card.id}
      type="button"
      className={`sequence-editor__library-card${isSelected ? ' sequence-editor__library-card--selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={actionLabel}
    >
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
      <span className="sequence-editor__library-name">{card.name}</span>
    </button>
  )

  // ── Cas : séquence pas encore créée ────────────────────────────────────────
  if (!sequence) {
    if (creationAvailabilityLoading) {
      return (
        <div className="sequence-editor sequence-editor--empty">
          <div className="sequence-editor__loading" aria-busy="true">
            <span className="sr-only">
              Chargement de la disponibilité du séquençage…
            </span>
          </div>
        </div>
      )
    }

    if (!canCreateSequence) {
      return (
        <div className="sequence-editor sequence-editor--empty sequence-editor--readonly">
          <p className="sequence-editor__hint">
            Aucune séquence pour &quot;{motherCardLabel}&quot;.
          </p>
          <p className="sequence-editor__readonly-notice">
            La création de séquence n&apos;est pas disponible pour le moment sur
            ce compte.
          </p>
        </div>
      )
    }

    return (
      <div className="sequence-editor sequence-editor--empty">
        <p className="sequence-editor__hint">
          Aucune séquence pour &quot;{motherCardLabel}&quot;.
        </p>
        <p className="sequence-editor__hint">
          Choisis 2 étapes pour créer la séquence.
        </p>
        <div className="sequence-editor__add-step">
          {[0, 1].map(index => (
            <div key={index} className="sequence-editor__picker">
              <p className="sequence-editor__add-label">
                Étape {index + 1}
                {initialStepCardIds[index] ? ' sélectionnée' : ' à choisir'}
              </p>
              <div
                className="sequence-editor__library"
                role="list"
                aria-label={`Cartes disponibles pour l'étape ${index + 1}`}
              >
                {getInitialOptions(index).map(card =>
                  renderCardButton({
                    card,
                    onClick: () => handleInitialStepChange(index, card.id),
                    disabled: isBusy,
                    isSelected: initialStepCardIds[index] === card.id,
                    actionLabel: `Choisir ${card.name} pour l'étape ${index + 1}`,
                  })
                )}
              </div>
            </div>
          ))}
          <div className="sequence-editor__add-row">
            <button
              type="button"
              className="sequence-editor__btn sequence-editor__btn--create"
              onClick={handleCreate}
              disabled={isBusy || !canSubmitInitialSequence}
              aria-busy={creating}
            >
              {creating ? 'Création…' : '+ Créer une séquence'}
            </button>
          </div>
        </div>
        {actionError && (
          <p className="sequence-editor__error" role="alert">
            {actionError}
          </p>
        )}
      </div>
    )
  }

  // ── Cas : séquence existante ────────────────────────────────────────────────
  return (
    <div
      className={`sequence-editor${isReadOnly ? ' sequence-editor--readonly' : ''}`}
    >
      {/* En-tête */}
      <div className="sequence-editor__header">
        <h3 className="sequence-editor__title">
          Séquence de &quot;{motherCardLabel}&quot;
        </h3>

        {/* Bouton supprimer séquence — masqué en lecture seule */}
        {!isReadOnly && (
          <>
            <button
              type="button"
              className={`sequence-editor__btn sequence-editor__btn--delete${confirmDelete ? ' sequence-editor__btn--delete-confirm' : ''}`}
              onClick={handleDelete}
              disabled={isBusy}
              aria-busy={deleting}
              aria-label={
                confirmDelete
                  ? 'Confirmer la suppression de la séquence'
                  : 'Supprimer cette séquence'
              }
            >
              {deleting
                ? 'Suppression…'
                : confirmDelete
                  ? 'Confirmer la suppression ?'
                  : 'Supprimer la séquence'}
            </button>
            {confirmDelete && (
              <button
                type="button"
                className="sequence-editor__btn sequence-editor__btn--cancel"
                onClick={() => setConfirmDelete(false)}
              >
                Annuler
              </button>
            )}
          </>
        )}
      </div>

      {/* Bandeau lecture seule — visible si édition locale désactivée par le parent */}
      {isReadOnly && (
        <p className="sequence-editor__readonly-notice">
          Lecture seule pour le moment.
        </p>
      )}

      {/* Message d'erreur */}
      {actionError && (
        <p className="sequence-editor__error" role="alert">
          {actionError}
        </p>
      )}

      {/* Liste des étapes */}
      {stepsLoading ? (
        <div className="sequence-editor__loading" aria-busy="true">
          <span className="sr-only">Chargement des étapes…</span>
        </div>
      ) : steps.length === 0 ? (
        <p className="sequence-editor__empty">
          Aucune étape. Ajoute au moins 2 étapes.
        </p>
      ) : (
        <ol
          className="sequence-editor__steps"
          aria-label="Étapes de la séquence"
        >
          {steps.map((step, idx) => {
            const card =
              bankCards.find(c => c.id === step.step_card_id) ??
              personalCards.find(c => c.id === step.step_card_id)
            const imageBucket = bankCards.some(c => c.id === step.step_card_id)
              ? 'bank-images'
              : 'personal-images'

            return (
              <li
                key={step.id}
                className="sequence-editor__step"
                aria-label={`Étape ${idx + 1} — ${card?.name ?? 'Carte inconnue'}`}
              >
                {/* Miniature + nom */}
                <div className="sequence-editor__step-card">
                  {card?.image_url ? (
                    <SignedImage
                      filePath={card.image_url}
                      alt={card.name}
                      bucket={imageBucket}
                      className="sequence-editor__step-image"
                    />
                  ) : (
                    <div
                      className="sequence-editor__step-placeholder"
                      aria-hidden="true"
                    >
                      📋
                    </div>
                  )}
                  <span className="sequence-editor__step-label">
                    {card?.name ?? 'Carte inconnue'}
                  </span>
                </div>

                {/* Contrôles ordre + suppression — masqués en lecture seule */}
                {!isReadOnly && (
                  <div className="sequence-editor__step-controls">
                    <button
                      type="button"
                      className="sequence-editor__step-btn"
                      onClick={() => handleMoveUp(step.id, step.position)}
                      disabled={idx === 0 || isBusy}
                      aria-label={`Monter l'étape ${idx + 1}`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="sequence-editor__step-btn"
                      onClick={() => handleMoveDown(step.id, step.position)}
                      disabled={idx === steps.length - 1 || isBusy}
                      aria-label={`Descendre l'étape ${idx + 1}`}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      className="sequence-editor__step-btn sequence-editor__step-btn--remove"
                      onClick={() => handleRemoveStep(step.id)}
                      disabled={isBusy || steps.length <= 2}
                      aria-label={`Supprimer l'étape ${idx + 1} — ${card?.name ?? ''}`}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {/* Ajout d'une étape — masqué en lecture seule */}
      {!isReadOnly && hasAvailableCards && (
        <div className="sequence-editor__add-step">
          <p
            className="sequence-editor__add-label"
            id={`seq-add-step-${sequence.id}`}
          >
            Ajouter une étape
          </p>
          {availableBankCards.length > 0 && (
            <div className="sequence-editor__picker">
              <p className="sequence-editor__section-title">Cartes banque</p>
              <div
                className="sequence-editor__library"
                role="list"
                aria-labelledby={`seq-add-step-${sequence.id}`}
              >
                {availableBankCards.map(card =>
                  renderCardButton({
                    card,
                    onClick: () => handleAddStep(card.id),
                    disabled: isBusy,
                    actionLabel: `Ajouter ${card.name} à la séquence`,
                  })
                )}
              </div>
            </div>
          )}
          {availablePersonalCards.length > 0 && (
            <div className="sequence-editor__picker">
              <p className="sequence-editor__section-title">Mes cartes</p>
              <div
                className="sequence-editor__library"
                role="list"
                aria-labelledby={`seq-add-step-${sequence.id}`}
              >
                {availablePersonalCards.map(card =>
                  renderCardButton({
                    card,
                    onClick: () => handleAddStep(card.id),
                    disabled: isBusy,
                    actionLabel: `Ajouter ${card.name} à la séquence`,
                  })
                )}
              </div>
            </div>
          )}
          <div className="sequence-editor__add-row">
            <p className="sequence-editor__hint">
              Choisis directement une carte pour l&apos;ajouter.
            </p>
          </div>
        </div>
      )}

      {/* Message si toutes les cartes sont déjà utilisées — uniquement pour Subscriber/Admin */}
      {!isReadOnly && !hasAvailableCards && steps.length > 0 && (
        <p className="sequence-editor__hint">
          Toutes les cartes disponibles sont déjà dans la séquence.
        </p>
      )}
    </div>
  )
}

export default SequenceEditor
