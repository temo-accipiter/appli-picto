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

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import type { Slot } from '@/hooks/useSlots'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import { resolveStorageImageUrl } from '@/utils/storage/resolveStorageImageUrl'
import { useAccountPreferences } from '@/hooks'
import { TrainProgressBar } from '@/components'
import './SessionComplete.scss'

interface SessionCompleteProps {
  /** Slot récompense de la timeline (kind='reward', card_id NOT NULL) */
  rewardSlot: Slot | null
  /** Carte associée au slot récompense */
  rewardCard: BankCard | PersonalCard | null
  /** Afficher la barre de progression (train) */
  showTrain: boolean
  /** Nombre total d'étapes (pour afficher le train à 100%) */
  totalSteps: number
  /** Variante d'affichage : intégrée au Tableau ou écran dédié */
  variant?: 'overlay' | 'screen'
}

export function SessionComplete({
  rewardSlot,
  rewardCard,
  showTrain,
  totalSteps,
  variant = 'screen',
}: SessionCompleteProps) {
  const hasReward =
    rewardSlot !== null && rewardSlot.card_id !== null && rewardCard !== null

  // Préférences utilisateur (confettis)
  const { preferences } = useAccountPreferences()
  const confettiEnabled = preferences?.confetti_enabled ?? true

  // État confettis (affichés pendant 10 secondes)
  const [showConfetti, setShowConfetti] = useState(true)
  const { width, height } = useWindowSize()

  useEffect(() => {
    if (!confettiEnabled) return

    const timer = setTimeout(() => {
      setShowConfetti(false)
    }, 10000) // 10 secondes

    return () => clearTimeout(timer)
  }, [confettiEnabled])

  // Résoudre URL signée pour l'image de récompense
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!rewardCard?.image_url) {
      setSignedImageUrl(null)
      return
    }

    const loadSignedUrl = async () => {
      try {
        const bucket =
          rewardCard.type === 'bank' ? 'bank-images' : 'personal-images'
        const url = await resolveStorageImageUrl(rewardCard.image_url, {
          bucket,
        })
        setSignedImageUrl(url)
      } catch (error) {
        console.error('[SessionComplete] Erreur résolution URL image:', error)
        setSignedImageUrl(null)
      }
    }

    void loadSignedUrl()
  }, [rewardCard?.image_url, rewardCard?.type])

  return (
    <div
      className={`session-complete session-complete--${variant}`}
      role="status"
      aria-live="polite"
    >
      {/* Confettis (si activés) */}
      {showConfetti && confettiEnabled && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={200}
          recycle={false}
          colors={['#FFE5E5', '#E5F3FF', '#FFF5E5', '#F0E5FF', '#E5FFE5']}
          gravity={0.15}
        />
      )}

      {/* Barre de progression (train) - montrant 100% */}
      {showTrain && (
        <section
          className="session-complete__train"
          aria-labelledby="progress-complete-heading"
        >
          <h2 id="progress-complete-heading" className="sr-only">
            Progression complète
          </h2>
          <TrainProgressBar total={totalSteps} done={totalSteps} />
        </section>
      )}

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
            {signedImageUrl ? (
              <Image
                src={signedImageUrl}
                alt={rewardCard.name ?? 'Récompense'}
                className="session-complete__reward-image"
                width={200}
                height={200}
                draggable={false}
                onError={() => {
                  console.log('[SessionComplete] Erreur chargement image')
                  setSignedImageUrl(null)
                }}
              />
            ) : (
              <div
                className="session-complete__reward-placeholder"
                aria-hidden="true"
              >
                🎁
              </div>
            )}
            <p className="session-complete__reward-name">{rewardCard.name}</p>
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
