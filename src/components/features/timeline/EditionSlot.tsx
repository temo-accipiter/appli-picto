'use client'

/**
 * EditionSlot - Slot éditable dans Timeline (mode Édition)
 *
 * Rôle :
 *   - Affiche un slot vide ou avec carte assignée
 *   - Zone droppable pour DnD (via DndSlot)
 *   - Sélecteur jetons (0-5) si type="step"
 *   - Bouton supprimer (si canDelete=true)
 *   - Style violet clair si type="reward"
 *
 * Contextes d'utilisation :
 *   - Planning Visuel : Slots Étapes + 1 Slot Récompense
 *   - Séquençage : Slots Étapes uniquement (pas de Récompense, pas de jetons)
 *
 * Accessibilité :
 *   - ARIA labels clairs (Étape 1, Récompense)
 *   - Touch targets 44px min (boutons)
 *   - Focus visible sur tous interactifs
 */

import { memo, ChangeEvent } from 'react'
import { DndSlot, SignedImage, ButtonDelete } from '@/components'
import './EditionSlot.scss'

export interface EditionSlotCard {
  id: string
  name: string
  imageUrl: string
}

export interface EditionSlotProps {
  /** ID unique du slot (pour DnD) */
  id: string

  /** Type de slot : step (Étape) ou reward (Récompense) */
  type: 'step' | 'reward'

  /** Carte assignée au slot (optionnel) */
  card?: EditionSlotCard

  /** Nombre de jetons (0-5, si type='step' uniquement) */
  tokens?: number

  /** Position dans la timeline (pour afficher "Étape 1", "Étape 2", etc.) */
  position: number

  /** Slot peut être supprimé (défaut: true) */
  canDelete?: boolean

  /** État : carte déjà validée dans Tableau (grisé, non modifiable) */
  isCompleted?: boolean

  /** Slot en cours de drag (pour feedback visuel) */
  isDraggingFrom?: boolean

  /** Handler changement jetons */
  onTokensChange?: (newTokens: number) => void

  /** Handler suppression slot */
  onDelete?: () => void

  /** Handler clic sur carte (édition/remplacement) */
  onCardClick?: () => void
}

const EditionSlot = memo(function EditionSlot({
  id,
  type,
  card,
  tokens = 0,
  position,
  canDelete = true,
  isCompleted = false,
  isDraggingFrom = false,
  onTokensChange,
  onDelete,
  onCardClick,
}: EditionSlotProps) {
  // Titre du slot
  const slotTitle = type === 'reward' ? 'Récompense' : `Étape ${position}`

  // Classes CSS conditionnelles
  const classNames = [
    'edition-slot',
    `edition-slot--${type}`,
    isCompleted && 'edition-slot--completed',
    !card && 'edition-slot--empty',
  ]
    .filter(Boolean)
    .join(' ')

  // Handler jetons (clamp 0-5)
  const handleTokensChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newTokens = Math.max(0, Math.min(5, parseInt(e.target.value, 10)))
    onTokensChange?.(newTokens)
  }

  return (
    <div className={classNames} data-testid={`edition-slot-${id}`}>
      {/* Header : Titre + Bouton supprimer */}
      <div className="edition-slot__header">
        <h3 className="edition-slot__title">{slotTitle}</h3>

        {canDelete && !isCompleted && onDelete && (
          <ButtonDelete
            onDelete={onDelete}
            className="edition-slot__delete"
            ariaLabel={`Supprimer ${slotTitle}`}
            size="sm"
          />
        )}
      </div>

      {/* Zone droppable DnD */}
      <DndSlot
        id={id}
        isDraggingFrom={isDraggingFrom}
        label={slotTitle}
        className="edition-slot__drop-zone"
      >
        {card ? (
          // Carte assignée
          <button
            type="button"
            className="edition-slot__card"
            onClick={onCardClick}
            disabled={isCompleted}
            aria-label={`${card.name} - Cliquer pour modifier`}
          >
            <SignedImage
              filePath={card.imageUrl}
              bucket="images"
              alt={card.name}
              size={120}
              className="edition-slot__image"
            />

            <span className="edition-slot__card-name">{card.name}</span>

            {isCompleted && (
              <span className="edition-slot__completed-badge">Déjà fait</span>
            )}
          </button>
        ) : (
          // Slot vide - texte indicatif
          <div className="edition-slot__placeholder">
            <span className="edition-slot__placeholder-icon" aria-hidden="true">
              ➕
            </span>
            <span className="edition-slot__placeholder-text">
              {type === 'reward'
                ? 'Glisser une récompense'
                : 'Glisser une tâche'}
            </span>
          </div>
        )}
      </DndSlot>

      {/* Sélecteur jetons (uniquement si type='step' et pas mode séquence) */}
      {type === 'step' && !isCompleted && onTokensChange && (
        <div className="edition-slot__tokens">
          <label
            htmlFor={`tokens-${id}`}
            className="edition-slot__tokens-label"
          >
            Jetons :
          </label>
          <select
            id={`tokens-${id}`}
            className="edition-slot__tokens-select"
            value={tokens}
            onChange={handleTokensChange}
            aria-label={`Nombre de jetons pour ${slotTitle}`}
          >
            {[0, 1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>
                {n === 0 ? 'Aucun' : `${n} jeton${n > 1 ? 's' : ''}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
})

EditionSlot.displayName = 'EditionSlot'

export default EditionSlot
