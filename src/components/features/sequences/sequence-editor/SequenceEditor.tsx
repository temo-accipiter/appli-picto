'use client'

/**
 * SequenceEditor — Éditeur de séquence pour une carte mère (contexte Édition, adulte).
 *
 * Permet à l'adulte (Subscriber/Admin) de :
 * - Créer une séquence liée à une carte
 * - Ajouter/supprimer des étapes (cartes)
 * - Réordonner les étapes (flèches haut/bas)
 * - Supprimer la séquence entière
 *
 * ⚠️ RÈGLES DB-FIRST
 * - CRUD via useSequences + useSequenceSteps (jamais de query directe)
 * - Min 2 étapes imposé par trigger DB (DEFERRABLE) — le front anticipe pour UX
 * - UNIQUE(sequence_id, step_card_id) → doublon rejeté par DB
 * - RLS : can_write_sequences() (subscriber/admin) est la GARDE PRINCIPALE côté SQL
 * - isReadOnly (Free) : mitigation UX uniquement — masque les contrôles d'écriture
 *   pour éviter des erreurs silencieuses. La règle métier reste enforcement SQL.
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

import { useState } from 'react'
import Image from 'next/image'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import type { Sequence } from '@/hooks/useSequences'
import useSequenceSteps from '@/hooks/useSequenceSteps'
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
    motherCardId: string
  ) => Promise<{ id: string | null; error: Error | null }>
  /** Supprimer la séquence entière */
  onDeleteSequence: (sequenceId: string) => Promise<{ error: Error | null }>
  /**
   * Lecture seule — mitigation UX pure.
   * La garde principale reste can_write_sequences() côté SQL/RLS.
   * Le parent fournit ce booléen dérivé de l'état applicatif déjà disponible.
   * Ne jamais fusionner Visitor (local-only) avec Free dans cette prop.
   */
  isReadOnly?: boolean
}

/** Traduit une erreur DB en message UX neutre */
function dbErrorToMessage(err: Error | null): string {
  if (!err) return ''
  const msg = err.message?.toLowerCase() ?? ''
  if (msg.includes('min') && msg.includes('step')) {
    return 'La séquence doit avoir au moins 2 étapes.'
  }
  if (msg.includes('unique') || msg.includes('duplicate')) {
    return 'Cette carte est déjà dans la séquence.'
  }
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
  isReadOnly = false,
}: SequenceEditorProps) {
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string>('')

  // Étapes de la séquence (vide si pas encore créée)
  const {
    steps,
    loading: stepsLoading,
    addStep,
    removeStep,
    moveStep,
  } = useSequenceSteps(sequence?.id ?? null)

  // ── Création de la séquence ─────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true)
    setActionError(null)
    const { error } = await onCreateSequence(motherCardId)
    setCreating(false)
    if (error) setActionError(dbErrorToMessage(error))
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
  const handleAddStep = async () => {
    if (!selectedCardId || !sequence) return
    setActionError(null)
    const { error } = await addStep(selectedCardId)
    if (error) {
      setActionError(dbErrorToMessage(error))
    } else {
      setSelectedCardId('')
    }
  }

  // ── Suppression d'une étape ─────────────────────────────────────────────────
  const handleRemoveStep = async (stepId: string) => {
    setActionError(null)
    const { error } = await removeStep(stepId)
    if (error) setActionError(dbErrorToMessage(error))
  }

  // ── Déplacement d'une étape ─────────────────────────────────────────────────
  const handleMoveUp = async (stepId: string, currentPosition: number) => {
    if (currentPosition === 0) return
    setActionError(null)
    const { error } = await moveStep(stepId, currentPosition - 1)
    if (error) setActionError("Impossible de déplacer l'étape. Réessaie.")
  }

  const handleMoveDown = async (stepId: string, currentPosition: number) => {
    if (currentPosition >= steps.length - 1) return
    setActionError(null)
    const { error } = await moveStep(stepId, currentPosition + 1)
    if (error) setActionError("Impossible de déplacer l'étape. Réessaie.")
  }

  // Toutes les cartes disponibles (banque + perso) sauf celles déjà dans la séquence
  const usedCardIds = new Set(steps.map(s => s.step_card_id))
  const availableBankCards = bankCards.filter(c => !usedCardIds.has(c.id))
  const availablePersonalCards = personalCards.filter(
    c => !usedCardIds.has(c.id)
  )
  const hasAvailableCards =
    availableBankCards.length > 0 || availablePersonalCards.length > 0

  const isBusy = creating || deleting

  // ── Cas : séquence pas encore créée ────────────────────────────────────────
  if (!sequence) {
    if (isReadOnly) {
      return (
        <div className="sequence-editor sequence-editor--empty sequence-editor--readonly">
          <p className="sequence-editor__hint">
            Aucune séquence pour &quot;{motherCardLabel}&quot;.
          </p>
          <p className="sequence-editor__readonly-notice">
            La création de séquences est réservée aux abonnés.
          </p>
        </div>
      )
    }

    return (
      <div className="sequence-editor sequence-editor--empty">
        <p className="sequence-editor__hint">
          Aucune séquence pour &quot;{motherCardLabel}&quot;.
        </p>
        <button
          type="button"
          className="sequence-editor__btn sequence-editor__btn--create"
          onClick={handleCreate}
          disabled={isBusy}
          aria-busy={creating}
        >
          {creating ? 'Création…' : '+ Créer une séquence'}
        </button>
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

      {/* Bandeau lecture seule — visible uniquement pour Free */}
      {isReadOnly && (
        <p className="sequence-editor__readonly-notice">
          Lecture seule — la modification des séquences est réservée aux
          abonnés.
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

            return (
              <li
                key={step.id}
                className="sequence-editor__step"
                aria-label={`Étape ${idx + 1} — ${card?.label ?? 'Carte inconnue'}`}
              >
                {/* Miniature + nom */}
                <div className="sequence-editor__step-card">
                  {card?.image_url ? (
                    <Image
                      src={card.image_url}
                      alt={card.label}
                      className="sequence-editor__step-image"
                      width={48}
                      height={48}
                      draggable={false}
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
                    {card?.label ?? 'Carte inconnue'}
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
                      disabled={isBusy}
                      aria-label={`Supprimer l'étape ${idx + 1} — ${card?.label ?? ''}`}
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
          <label
            className="sequence-editor__add-label"
            htmlFor={`seq-add-step-${sequence.id}`}
          >
            Ajouter une étape
          </label>
          <div className="sequence-editor__add-row">
            <select
              id={`seq-add-step-${sequence.id}`}
              className="sequence-editor__add-select"
              value={selectedCardId}
              onChange={e => setSelectedCardId(e.target.value)}
              disabled={isBusy}
              aria-label="Choisir une carte à ajouter comme étape"
            >
              <option value="">— Choisir une carte —</option>
              {availableBankCards.length > 0 && (
                <optgroup label="Cartes banque">
                  {availableBankCards.map(card => (
                    <option key={card.id} value={card.id}>
                      {card.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {availablePersonalCards.length > 0 && (
                <optgroup label="Mes cartes">
                  {availablePersonalCards.map(card => (
                    <option key={card.id} value={card.id}>
                      {card.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              type="button"
              className="sequence-editor__btn sequence-editor__btn--add"
              onClick={handleAddStep}
              disabled={!selectedCardId || isBusy}
            >
              Ajouter
            </button>
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
