'use client'

/**
 * Timeline - Container horizontal sticky pour Planning Visuel & Séquençage
 *
 * Rôle :
 *   - Affiche une suite de slots (Édition) ou de cartes (Tableau)
 *   - Scroll horizontal si déborde
 *   - Sticky en haut de page (optionnel)
 *   - Bouton ➕ "Ajouter étape" (mode Édition uniquement)
 *
 * Contextes d'utilisation :
 *   - Édition : Timeline avec EditionSlot (DnD, jetons, modification)
 *   - Tableau : Timeline avec TableauCard (états, validation)
 *   - Séquençage : Timeline avec EditionSlot (pas de Récompense, pas de jetons)
 *
 * Accessibilité :
 *   - ARIA labels clairs
 *   - Navigation clavier (scroll horizontal)
 *   - Touch-friendly (scroll fluide mobile)
 */

import { ReactNode, memo } from 'react'
import './Timeline.scss'

export interface TimelineProps {
  /** Type de timeline : planning (Étapes + Récompense) ou sequence (Étapes uniquement) */
  mode: 'planning' | 'sequence'

  /** Contexte d'affichage : edition (adulte) ou tableau (enfant) */
  context: 'edition' | 'tableau'

  /** Slots (EditionSlot) ou Cartes (TableauCard) à afficher */
  children: ReactNode

  /** Handler bouton ➕ "Ajouter étape" (Édition uniquement) */
  onAddSlot?: () => void

  /** Timeline sticky en haut (défaut: true) */
  sticky?: boolean

  /** Classes CSS additionnelles */
  className?: string

  /** ID unique pour accessibilité */
  id?: string

  /** Label ARIA personnalisé */
  ariaLabel?: string
}

const Timeline = memo(function Timeline({
  mode,
  context,
  children,
  onAddSlot,
  sticky = true,
  className = '',
  id = 'timeline',
  ariaLabel,
}: TimelineProps) {
  // Classes CSS conditionnelles
  const classNames = [
    'timeline',
    `timeline--${mode}`,
    `timeline--${context}`,
    sticky && 'timeline--sticky',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Label ARIA par défaut selon le mode
  const defaultAriaLabel =
    mode === 'planning'
      ? 'Planning visuel - Suite de tâches et récompense'
      : 'Séquence - Étapes détaillées de la tâche'

  // Afficher bouton ➕ uniquement si contexte Édition ET handler fourni
  const showAddButton = context === 'edition' && onAddSlot

  return (
    <div className={classNames} data-testid={`timeline-${id}`}>
      {/* Header avec titre et bouton ➕ */}
      <div className="timeline__header">
        <h2 className="timeline__title">
          {mode === 'planning' ? 'Planning visuel' : 'Séquence'}
        </h2>

        {showAddButton && (
          <button
            type="button"
            className="timeline__add-button"
            onClick={onAddSlot}
            aria-label="Ajouter une étape"
            data-testid="timeline-add-button"
          >
            <span className="timeline__add-icon" aria-hidden="true">
              ➕
            </span>
            <span className="timeline__add-text">Ajouter étape</span>
          </button>
        )}
      </div>

      {/* Container scrollable horizontal pour les slots/cartes */}
      <div
        className="timeline__container"
        role="region"
        aria-label={ariaLabel || defaultAriaLabel}
        id={id}
      >
        <div className="timeline__track">{children}</div>
      </div>
    </div>
  )
})

Timeline.displayName = 'Timeline'

export default Timeline
