'use client'

// src/components/features/tableau/session-complete/SessionComplete.tsx
// Écran "Session terminée" affiché quand toutes les étapes sont validées
//
// ⚠️ Règles Contexte Tableau (§3.1.3, §6.2)
// - Lecture seule : aucune action possible sur les étapes
// - Récompense débloquée si un slot reward avec card_id NOT NULL existe
// - Si pas de récompense → feedback neutre/positif uniquement (JAMAIS négatif)
// - Interface calme, apaisante, TSA-friendly
// - ZÉRO message technique

import Image from 'next/image'
import type { Slot } from '@/hooks/useSlots'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import './SessionComplete.scss'

interface SessionCompleteProps {
  /** Slot récompense de la timeline (kind='reward', card_id NOT NULL) */
  rewardSlot: Slot | null
  /** Carte associée au slot récompense */
  rewardCard: BankCard | PersonalCard | null
}

export function SessionComplete({
  rewardSlot,
  rewardCard,
}: SessionCompleteProps) {
  const hasReward =
    rewardSlot !== null && rewardSlot.card_id !== null && rewardCard !== null

  return (
    <div className="session-complete" role="status" aria-live="polite">
      {/* Message de félicitation — toujours positif */}
      <div className="session-complete__message">
        <span className="session-complete__icon" aria-hidden="true">
          ⭐
        </span>
        <p className="session-complete__text">Bravo ! Tout est fait !</p>
      </div>

      {/* Récompense (si présente) */}
      {hasReward && rewardCard && (
        <div
          className="session-complete__reward"
          aria-label="Récompense débloquée"
        >
          <p className="session-complete__reward-label">Ta récompense :</p>

          <div className="session-complete__reward-card">
            {rewardCard.image_url ? (
              <Image
                src={rewardCard.image_url}
                alt={rewardCard.label}
                className="session-complete__reward-image"
                width={200}
                height={200}
                draggable={false}
              />
            ) : (
              <div
                className="session-complete__reward-placeholder"
                aria-hidden="true"
              >
                🎁
              </div>
            )}
            <p className="session-complete__reward-name">{rewardCard.label}</p>
          </div>
        </div>
      )}

      {/* Feedback neutre si pas de récompense */}
      {!hasReward && (
        <p className="session-complete__no-reward" aria-hidden="true">
          🌟
        </p>
      )}
    </div>
  )
}
