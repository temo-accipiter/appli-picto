'use client'

/**
 * SlotItem — Affichage et édition d'un seul slot dans l'éditeur de timeline.
 *
 * ⚠️ RÈGLES TSA
 * - Interface simple et prévisible.
 * - Transitions douces ≤ 0.3s.
 * - Cibles tactiles ≥ 44px.
 * - Pas de jargon technique.
 *
 * ⚠️ RÈGLES DB-FIRST
 * - tokens : 0-5 pour step, null pour reward (contrainte DB)
 * - card_id : FK optionnelle (null = non attribuée)
 * - Toutes les modifications passent par onUpdate → remontées à useSlots → DB
 *
 * ⚠️ MATRICE DE VERROUILLAGE S6 (§3.2.2bis)
 * - Session terminée ou inexistante → tout éditable
 * - Session preview (0 validation) → tout éditable
 * - Session démarrée (≥1 validation) :
 *     Slot validé  : delete ❌, update tokens ❌, change card ❌
 *     Slot non validé : delete ✅, update tokens ❌, change card ✅
 *
 * ⚠️ PHASE 1 : Sélection carte via checkbox bibliothèque
 * - CardPicker retiré de SlotItem (slots step uniquement)
 * - Assignation carte = checkbox bibliothèque (Edition.tsx → CardsEdition)
 * - Récompenses : pas de modification dans cette phase
 */

import { useState, useCallback, type ChangeEvent } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Slot } from '@/hooks/useSlots'
import type { SessionState } from '@/hooks/useSessions'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import type { Sequence } from '@/hooks/useSequences'
import { Button, ButtonDelete, SignedImage } from '@/components'
import '@/components/shared/dnd/DndCard/DndCard.scss'
import './SlotItem.scss'

interface SlotItemProps {
  slot: Slot
  /** Indice humain (position + 1) */
  positionLabel: number
  /** Modifier ce slot (card_id et/ou tokens) */
  onUpdate: (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => Promise<{ error: Error | null }>
  /** Supprimer ce slot (peut être refusé par la DB si dernier du genre) */
  onRemove: (id: string) => void
  /** Cartes banque disponibles (transmises par SlotsEditor) */
  bankCards: BankCard[]
  /** Cartes personnelles disponibles (transmises par SlotsEditor) */
  personalCards: PersonalCard[]
  /** Opération de suppression en cours */
  busy?: boolean
  /** Afficher l'action de suppression pour ce slot */
  canRemove?: boolean
  // ── S6 : Verrouillage selon état session ──────────────────────────────────
  /**
   * État de la session active pour ce profil+timeline.
   * null = aucune session, 'completed' = terminée → tout éditable.
   * 'active_preview' → tout éditable.
   * 'active_started' → verrouillage conditionnel par isValidated.
   */
  sessionState?: SessionState | null
  /** Ce slot a-t-il été validé dans la session en cours ? */
  isValidated?: boolean
  // ── S7 : Séquence ──────────────────────────────────────────────────────────
  /**
   * Séquence existante pour la carte assignée à ce slot.
   * null = pas de séquence. Le bouton "Gérer la séquence" s'affiche
   * uniquement pour les étapes (kind='step') ayant une carte assignée.
   */
  sequence?: Sequence | null
  /**
   * Créer une séquence pour la carte de ce slot.
   * Fourni par le parent (SlotsEditor → useSequences).
   */
  onCreateSequence?: (
    motherCardId: string,
    stepCardIds: string[]
  ) => Promise<{ id: string | null; error: Error | null }>
  /**
   * Supprimer la séquence liée à ce slot.
   * Fourni par le parent (SlotsEditor → useSequences).
   */
  onDeleteSequence?: (sequenceId: string) => Promise<{ error: Error | null }>
  /**
   * Création possible uniquement si la source active sait réellement créer
   * une séquence dans le contrat courant.
   */
  canCreateSequence?: boolean
  /** Ouvrir l'éditeur de séquence hors de la carte (piloté par le parent). */
  onOpenSequenceEditor?: (slot: Slot) => void
  /** Le modal séquence est-il actuellement ouvert pour ce slot ? */
  isSequenceEditorOpen?: boolean
  /**
   * S8 : Désactiver les actions structurelles si le navigateur est offline.
   * §4.4 : CRUD structure interdit offline (guard UX).
   */
  isOffline?: boolean
  /**
   * S9 : Désactiver les actions structurelles si le compte est en mode execution-only.
   * §6.1 catégorie #8 : CRUD structure interdit, exécution (sessions, validations) autorisée.
   */
  isExecutionOnly?: boolean
  /**
   * Ticket 3 : Séquençage en lecture seule.
   * Free cloud → readonly, Visitor local → éditable, Subscriber/Admin cloud → éditable.
   */
  isSequenceReadOnly?: boolean
  /** Numéro de l'étape parmi les étapes uniquement (1, 2, 3…) — undefined pour les rewards */
  stepNumber?: number
  /** ID DnD du slot (même valeur que slot.id) */
  dndSlotId?: string
  /** Indique si ce slot est la source active du drag */
  isDragActive?: boolean
  /**
   * Callback pour exposer le ref DOM au parent (gestion focus post-suppression).
   * Permet au SlotsEditor de gérer le focus programmatique après suppression.
   */
  setSlotRef?: (node: HTMLLIElement | null) => void
}

/** Libellé selon le kind du slot */
const SLOT_LABELS: Record<'step' | 'reward', string> = {
  step: 'Étape',
  reward: 'Récompense',
}

/** Options du select jetons (0 à 5) avec emoji jeton */
const TOKEN_OPTIONS = [0, 1, 2, 3, 4, 5]

export function SlotItem({
  slot,
  positionLabel,
  onUpdate,
  onRemove,
  bankCards,
  personalCards,
  busy = false,
  canRemove = true,
  sessionState = null,
  isValidated = false,
  sequence = null,
  onCreateSequence,
  onDeleteSequence,
  canCreateSequence = false,
  onOpenSequenceEditor,
  isSequenceEditorOpen = false,
  isOffline = false,
  isExecutionOnly = false,
  stepNumber,
  dndSlotId,
  isDragActive = false,
  setSlotRef,
}: SlotItemProps) {
  const isStep = slot.kind === 'step'

  // ── Calcul de la matrice de verrouillage ──────────────────────────────────
  const isSessionStarted = sessionState === 'active_started'

  const isFullyLocked =
    (isSessionStarted && isValidated) || isOffline || isExecutionOnly

  const isDeleteLocked = isSessionStarted || isOffline || isExecutionOnly

  const tokensLocked =
    (isSessionStarted && isValidated) || isOffline || isExecutionOnly
  const isEmptyStep = isStep && slot.card_id === null
  const areTokensEditable = !tokensLocked && !isEmptyStep
  const canDragCard = !isFullyLocked && !busy && slot.card_id !== null
  const canDropCard = !isFullyLocked && !busy

  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: dndSlotId ?? slot.id,
    disabled: !canDragCard,
  })
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: dndSlotId ?? slot.id,
    disabled: !canDropCard,
  })

  const composedRef = useCallback(
    (node: HTMLLIElement | null) => {
      setDroppableRef(node)
      setSlotRef?.(node)
    },
    [setDroppableRef, setSlotRef]
  )

  const [updatingTokens, setUpdatingTokens] = useState(false)
  const [tokensError, setTokensError] = useState<string | null>(null)

  const canManageSequence =
    isStep && slot.card_id !== null && (onCreateSequence || onDeleteSequence)

  const isSequenceActionDisabled = isFullyLocked || !canManageSequence

  const handleTokensChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    if (!areTokensEditable) return

    const value = parseInt(e.target.value, 10)
    if (isNaN(value) || value < 0 || value > 5) return

    setUpdatingTokens(true)
    setTokensError(null)

    const { error } = await onUpdate(slot.id, { tokens: value })

    setUpdatingTokens(false)
    if (error) setTokensError('Erreur mise à jour jetons.')
  }

  const assignedCard =
    slot.card_id !== null
      ? (bankCards.find(c => c.id === slot.card_id) ??
        personalCards.find(c => c.id === slot.card_id))
      : null

  const lockBadge = isFullyLocked ? (
    <span
      className="slot-item__lock"
      aria-label="Étape validée — non modifiable"
      title="Validé"
    >
      🔒
    </span>
  ) : null

  return (
    <li
      ref={composedRef}
      tabIndex={-1}
      className={`slot-item slot-item--${slot.kind}${isFullyLocked ? ' slot-item--locked' : ''}`}
      aria-label={`Position ${positionLabel} — ${SLOT_LABELS[slot.kind]}${isFullyLocked ? ' (validé)' : ''}`}
      aria-busy={busy || undefined}
      data-drag-active={isDragActive || undefined}
      data-drag-over={isOver || undefined}
      data-dragging={isDragging || undefined}
    >
      {/* ── Partie 1 : Label + bouton supprimer ──────────────────────────────── */}
      <div className="slot-item__header">
        <span className="slot-item__label">
          {isStep
            ? `${SLOT_LABELS.step} ${stepNumber ?? positionLabel}`
            : SLOT_LABELS.reward}
        </span>
        <div className="slot-item__header-actions">
          {lockBadge}
          {canRemove && (
            <ButtonDelete
              onClick={() => onRemove(slot.id)}
              disabled={busy || isDeleteLocked}
              title={
                isSessionStarted && !isValidated
                  ? 'Session en cours — annulez pour modifier les étapes'
                  : `Supprimer la ${SLOT_LABELS[slot.kind].toLowerCase()} #${positionLabel}`
              }
            />
          )}
        </div>
      </div>

      {/* ── Séparateur 1 : entre header et image ─────────────────────────────── */}
      <div className="slot-item__separator" aria-hidden="true" />

      {/* ── Partie 2 : Image + titre ─────────────────────────────────────────── */}
      {slot.card_id === null ? (
        <div className="slot-item__placeholder">
          <span className="slot-item__empty-text">Vide</span>
        </div>
      ) : (
        <div className="slot-item__card-display">
          <div
            ref={setDraggableRef}
            {...attributes}
            {...listeners}
            className={
              canDragCard
                ? `dnd-card${isDragging ? ' dnd-card--dragging' : ''}`
                : ''
            }
            tabIndex={canDragCard ? 0 : undefined}
            aria-label={
              canDragCard
                ? "Glisser l'image pour réorganiser la timeline"
                : undefined
            }
            aria-grabbed={canDragCard ? isDragging : undefined}
          >
            {assignedCard?.image_url ? (
              <SignedImage
                filePath={assignedCard.image_url}
                alt={assignedCard.name}
                bucket={
                  bankCards.some(c => c.id === slot.card_id)
                    ? 'bank-images'
                    : 'personal-images'
                }
                className="slot-item__card-image"
              />
            ) : (
              <div className="slot-item__card-fallback">
                <span>Image indisponible</span>
              </div>
            )}
          </div>

          {assignedCard && (
            <span className="slot-item__card-name">{assignedCard.name}</span>
          )}
        </div>
      )}

      {/* ── Séparateur 2 + Partie 3 : uniquement pour les étapes ────────────── */}
      {isStep && (
        <>
          <div className="slot-item__separator" aria-hidden="true" />

          {/* Partie 3 : Select jetons (gauche) + Séquence (droite) */}
          <div className="slot-item__footer">
            <div className="slot-item__tokens-control">
              <select
                id={`tokens-${slot.id}`}
                className="slot-item__tokens-select"
                value={slot.tokens ?? 0}
                onChange={handleTokensChange}
                disabled={busy || updatingTokens || !areTokensEditable}
                aria-busy={updatingTokens}
                aria-disabled={!areTokensEditable}
                aria-label={`Nombre de jetons pour l'étape #${positionLabel} (0 à 5)${
                  tokensLocked
                    ? ' — verrouillé pendant la session'
                    : isEmptyStep
                      ? ' — ajoute une carte pour modifier les jetons'
                      : ''
                }`}
              >
                {TOKEN_OPTIONS.map(n => (
                  <option key={n} value={n}>
                    🪙 {n}
                  </option>
                ))}
              </select>
              {tokensError && (
                <p className="slot-item__tokens-error" role="alert">
                  {tokensError}
                </p>
              )}
            </div>

            <Button
              variant="default"
              className={`slot-item__sequence-toggle${sequence ? ' slot-item__sequence-toggle--has-sequence' : ''}`}
              onClick={() => onOpenSequenceEditor?.(slot)}
              disabled={isSequenceActionDisabled}
              aria-expanded={isSequenceEditorOpen}
              aria-haspopup="dialog"
              aria-label={
                isEmptyStep
                  ? 'Ajoute une carte pour créer une séquence'
                  : isFullyLocked
                    ? 'Étape validée — séquence non modifiable'
                    : sequence
                      ? 'Modifier la séquence'
                      : canCreateSequence
                        ? 'Créer une séquence'
                        : 'Voir les informations de séquence'
              }
              label={sequence ? 'Séquence' : '+ Séquence'}
            />
          </div>
        </>
      )}
    </li>
  )
}

export default SlotItem
