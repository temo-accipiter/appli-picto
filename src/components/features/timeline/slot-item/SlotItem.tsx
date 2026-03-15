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

import { useState, type ChangeEvent } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Slot } from '@/hooks/useSlots'
import type { SessionState } from '@/hooks/useSessions'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import type { Sequence } from '@/hooks/useSequences'
import { Button, ButtonDelete, SignedImage } from '@/components'
import { SequenceEditor } from '@/components/features/sequences'
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
  /** Chargement de la capacité d'écriture séquençage côté compte cloud. */
  sequenceCreationAvailabilityLoading?: boolean
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
  /** ID DnD du slot (même valeur que slot.id) */
  dndSlotId?: string
  /** Indique si ce slot est la source active du drag */
  isDragActive?: boolean
}

/** Icône selon le kind du slot */
const SLOT_ICONS: Record<'step' | 'reward', string> = {
  step: '🎯',
  reward: '🏆',
}

/** Libellé selon le kind du slot */
const SLOT_LABELS: Record<'step' | 'reward', string> = {
  step: 'Étape',
  reward: 'Récompense',
}

export function SlotItem({
  slot,
  positionLabel,
  onUpdate,
  onRemove,
  bankCards,
  personalCards,
  busy = false,
  sessionState = null,
  isValidated = false,
  sequence = null,
  onCreateSequence,
  onDeleteSequence,
  canCreateSequence = false,
  sequenceCreationAvailabilityLoading = false,
  isOffline = false,
  isExecutionOnly = false,
  isSequenceReadOnly = false,
  dndSlotId,
  isDragActive = false,
}: SlotItemProps) {
  const isStep = slot.kind === 'step'

  // ── Calcul de la matrice de verrouillage (§3.2.2bis) ──────────────────────
  const isSessionStarted = sessionState === 'active_started'

  // Slot validé pendant session démarrée → tout verrouillé
  // §4.4 S8 : Offline → même comportement que slot validé (tout verrouillé)
  // §6.1 catégorie #8 S9 : Execution-only → même comportement (structure verrouillée)
  const isFullyLocked =
    (isSessionStarted && isValidated) || isOffline || isExecutionOnly

  // Pendant session démarrée, les jetons sont toujours non modifiables
  // (même sur slot non validé — exception : nouveau slot lors de l'ajout,
  //  mais on ne peut pas distinguer ici → restriction conservatrice)
  const tokensLocked = isSessionStarted || isOffline || isExecutionOnly
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

  // État local pour le contrôle tokens (UI optimiste — refresh hook sur succès)
  const [updatingTokens, setUpdatingTokens] = useState(false)
  const [tokensError, setTokensError] = useState<string | null>(null)

  // État local pour afficher/masquer le SequenceEditor
  const [sequenceEditorOpen, setSequenceEditorOpen] = useState(false)

  // Séquençage disponible : uniquement pour les étapes avec une carte assignée
  const canManageSequence =
    isStep && slot.card_id !== null && (onCreateSequence || onDeleteSequence)

  const handleTokensChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    // Validation côté client (double filet — la DB a aussi le CHECK)
    if (isNaN(value) || value < 0 || value > 5) return

    setUpdatingTokens(true)
    setTokensError(null)

    const { error } = await onUpdate(slot.id, { tokens: value })

    setUpdatingTokens(false)
    if (error) setTokensError('Erreur mise à jour jetons.')
  }

  // Trouver la carte assignée pour afficher son image
  const assignedCard =
    slot.card_id !== null
      ? (bankCards.find(c => c.id === slot.card_id) ??
        personalCards.find(c => c.id === slot.card_id))
      : null

  // Indicateur visuel pour les slots verrouillés
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
      ref={setDroppableRef}
      className={`slot-item slot-item--${slot.kind}${isFullyLocked ? ' slot-item--locked' : ''}`}
      aria-label={`Position ${positionLabel} — ${SLOT_LABELS[slot.kind]}${isFullyLocked ? ' (validé)' : ''}`}
      aria-busy={busy || undefined}
      data-drag-active={isDragActive || undefined}
      data-drag-over={isOver || undefined}
      data-dragging={isDragging || undefined}
    >
      {/* ── Bouton supprimer en haut à droite (PHASE 1) ──────────────────────── */}
      <div className="slot-item__header">
        {/* Indicateur de verrou (slot validé) */}
        {lockBadge}

        {/* Bouton supprimer — désactivé si slot validé pendant session démarrée */}
        <ButtonDelete
          onClick={() => onRemove(slot.id)}
          disabled={busy || isFullyLocked}
          title={`Supprimer la ${SLOT_LABELS[slot.kind].toLowerCase()} #${positionLabel}`}
        />
      </div>

      {/* ── Centre : placeholder (vide) vs image carte (rempli) ─────────────── */}
      {slot.card_id === null ? (
        // Slot vide : afficher icône + meta centrés
        <div className="slot-item__placeholder">
          <span className="slot-item__icon" aria-hidden="true" role="img">
            {SLOT_ICONS[slot.kind]}
          </span>

          <div className="slot-item__meta">
            <span className="slot-item__position" aria-hidden="true">
              #{positionLabel}
            </span>
            <span className="slot-item__kind">{SLOT_LABELS[slot.kind]}</span>
          </div>
        </div>
      ) : (
        // Slot rempli : afficher nom + image de la carte assignée
        <div className="slot-item__card-display">
          {/* Nom de la carte au-dessus de l'image */}
          {assignedCard && (
            <span className="slot-item__card-name">{assignedCard.name}</span>
          )}

          {/* Image de la carte = handle DnD (focusable clavier) */}
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
                ? 'Glisser l’image pour réorganiser la timeline'
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
        </div>
      )}

      {/* ── Contrôle tokens en bas à droite (étapes uniquement) ──────────────── */}
      {isStep && (
        <div className="slot-item__tokens-control">
          <label
            className="slot-item__tokens-label"
            htmlFor={`tokens-${slot.id}`}
          >
            Jetons 🪙
          </label>
          <input
            id={`tokens-${slot.id}`}
            type="number"
            className="slot-item__tokens-input"
            min={0}
            max={5}
            value={slot.tokens ?? 0}
            onChange={handleTokensChange}
            disabled={busy || updatingTokens || tokensLocked}
            aria-busy={updatingTokens}
            aria-disabled={tokensLocked}
            aria-label={`Nombre de jetons pour l'étape #${positionLabel} (0 à 5)${tokensLocked ? ' — verrouillé pendant la session' : ''}`}
          />
          {tokensError && (
            <p className="slot-item__tokens-error" role="alert">
              {tokensError}
            </p>
          )}
        </div>
      )}

      {/* ── Gestion séquence (S7 — étapes uniquement, carte assignée) ─────────── */}
      {canManageSequence && (
        <div className="slot-item__sequence">
          <Button
            variant="default"
            className={`slot-item__sequence-toggle${sequenceEditorOpen ? ' slot-item__sequence-toggle--open' : ''}`}
            onClick={() => setSequenceEditorOpen(o => !o)}
            aria-expanded={sequenceEditorOpen}
            aria-label={
              sequenceEditorOpen
                ? "Masquer l'éditeur de séquence"
                : sequence
                  ? 'Modifier la séquence'
                  : canCreateSequence
                    ? 'Créer une séquence'
                    : 'Voir les informations de séquence'
            }
            label={
              sequence
                ? '📋 Séquence'
                : canCreateSequence
                  ? '📋 Ajouter une séquence'
                  : '📋 Séquence'
            }
          />

          {sequenceEditorOpen && (
            <SequenceEditor
              motherCardId={slot.card_id!}
              motherCardLabel={assignedCard?.name ?? 'Carte'}
              sequence={sequence}
              bankCards={bankCards}
              personalCards={personalCards}
              onCreateSequence={onCreateSequence!}
              onDeleteSequence={onDeleteSequence!}
              canCreateSequence={canCreateSequence}
              creationAvailabilityLoading={sequenceCreationAvailabilityLoading}
              isReadOnly={isSequenceReadOnly}
            />
          )}
        </div>
      )}
    </li>
  )
}

export default SlotItem
