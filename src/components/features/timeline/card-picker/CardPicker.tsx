'use client'

/**
 * CardPicker — Sélecteur de carte pour un slot.
 *
 * ⚠️ RÈGLES TSA
 * - Sauvegarde automatique au changement (pas de bouton "Valider").
 * - Interface simple : un <select> natif, pas de popup.
 * - Feedback visuel immédiat (état saving).
 *
 * ⚠️ RÈGLES DB-FIRST
 * - L'appel UPDATE est géré par le parent via onSelect.
 * - La DB refuse si card_id invalide (FK constraint).
 * - Les erreurs DB sont remontées et affichées par le parent.
 *
 * Props :
 * - bankCards    : liste cartes banque (publiques)
 * - personalCards: liste cartes personnelles (null si non connecté / Free)
 * - currentCardId: ID carte actuellement assignée (null = non attribuée)
 * - onSelect     : callback appelé avec le nouvel ID (ou null si "Non attribuée")
 * - disabled     : désactive le sélecteur (ex : autre opération en cours)
 */

import { useState, type ChangeEvent } from 'react'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import './CardPicker.scss'

interface CardPickerProps {
  bankCards: BankCard[]
  personalCards: PersonalCard[]
  currentCardId: string | null
  onSelect: (cardId: string | null) => Promise<{ error: Error | null }>
  disabled?: boolean
}

export function CardPicker({
  bankCards,
  personalCards,
  currentCardId,
  onSelect,
  disabled = false,
}: CardPickerProps) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    // "" = non attribuée → null en DB
    const cardId = value === '' ? null : value

    setSaving(true)
    setSaveError(null)

    const { error } = await onSelect(cardId)

    setSaving(false)
    if (error) setSaveError("Erreur lors de l'assignation. Réessaie.")
  }

  return (
    <div className="card-picker">
      <label
        className="card-picker__label"
        htmlFor={`card-picker-${currentCardId ?? 'none'}`}
      >
        Carte
      </label>

      <div className="card-picker__row">
        <select
          id={`card-picker-${currentCardId ?? 'none'}`}
          className="card-picker__select"
          value={currentCardId ?? ''}
          onChange={handleChange}
          disabled={disabled || saving}
          aria-busy={saving}
          aria-label="Choisir une carte à assigner à ce slot"
        >
          {/* Option vide = non attribuée */}
          <option value="">— Non attribuée —</option>

          {/* Cartes banque */}
          {bankCards.length > 0 && (
            <optgroup label="Cartes banque">
              {bankCards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </optgroup>
          )}

          {/* Cartes personnelles (vide si Free / non connecté) */}
          {personalCards.length > 0 && (
            <optgroup label="Mes cartes">
              {personalCards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Indicateur sauvegarde */}
        {saving && (
          <span className="card-picker__saving" aria-live="polite">
            …
          </span>
        )}
      </div>

      {/* Erreur d'assignation */}
      {saveError && (
        <p className="card-picker__error" role="alert">
          {saveError}
        </p>
      )}
    </div>
  )
}

export default CardPicker
