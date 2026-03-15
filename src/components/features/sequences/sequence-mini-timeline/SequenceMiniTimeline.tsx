'use client'

/**
 * SequenceMiniTimeline — Mini-timeline de séquence (contexte Tableau, enfant).
 *
 * Affiche les sous-étapes d'une carte mère, sous forme de timeline horizontale
 * scrollable. Chaque étape peut être marquée "fait" par un simple clic ou tap.
 *
 * ⚠️ ÉTAT LOCAL-ONLY
 * - L'état "fait" de chaque étape N'EST PAS persisté en DB.
 * - Il se remet à zéro à chaque session (monté/démonté avec la carte).
 * - Aucun lien avec la validation de la carte mère (SlotCard).
 *
 * ⚠️ RÈGLES TSA
 * - Interface calme, prévisible.
 * - Transition de fermeture douce ≤ 0.3s (gérée par CSS).
 * - Cibles tactiles ≥ 44px.
 * - ZÉRO message technique ou erreur visible par l'enfant.
 * - Le "fait" est une aide visuelle — pas une contrainte.
 *
 * ⚠️ RÈGLES CONTEXTE TABLEAU
 * - ZÉRO action réseau dans ce composant.
 * - Aucun lien avec le système de jetons ou de slots.
 * - Tap sur image = marque "fait", pas de validation de la carte mère.
 *
 * ⚠️ SYSTÈME SÉQUENÇAGE — DISTINCT DU PLANNING ET DES JETONS
 */

import { SignedImage } from '@/components'
import { useState, useCallback } from 'react'
import type { SequenceStep } from '@/hooks/useSequenceSteps'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import './SequenceMiniTimeline.scss'

interface SequenceMiniTimelineProps {
  /** Étapes de la séquence (triées par position ASC) */
  steps: SequenceStep[]
  /** Cartes banque disponibles (pour afficher l'image + le nom) */
  bankCards: BankCard[]
  /** Cartes personnelles disponibles */
  personalCards: PersonalCard[]
  /** Callback de fermeture (quand l'enfant clique sur "Fermer") */
  onClose: () => void
}

export function SequenceMiniTimeline({
  steps,
  bankCards,
  personalCards,
  onClose,
}: SequenceMiniTimelineProps) {
  // État local "fait" par step_id — local-only, jamais persisté
  const [doneStepIds, setDoneStepIds] = useState<Set<string>>(new Set())

  const toggleDone = useCallback((stepId: string) => {
    setDoneStepIds(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        // On autorise de "décocher" une étape locale (aide à l'enfant, pas contrainte)
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }, [])

  /** Cherche la carte dans banque + perso */
  const findCard = (cardId: string): BankCard | PersonalCard | null => {
    return (
      bankCards.find(c => c.id === cardId) ??
      personalCards.find(c => c.id === cardId) ??
      null
    )
  }

  return (
    <div
      className="sequence-mini-timeline"
      aria-label="Étapes de la séquence"
      role="region"
    >
      {/* Bouton fermeture */}
      <button
        type="button"
        className="sequence-mini-timeline__close"
        onClick={onClose}
        aria-label="Fermer les étapes"
      >
        ✕
      </button>

      {/* Liste horizontale scrollable */}
      <ol className="sequence-mini-timeline__list" aria-label="Étapes à faire">
        {steps.map((step, idx) => {
          const card = findCard(step.step_card_id)
          const isDone = doneStepIds.has(step.id)
          const imageBucket = bankCards.some(c => c.id === step.step_card_id)
            ? 'bank-images'
            : 'personal-images'
          const label = card?.name ?? `Étape ${idx + 1}`

          return (
            <li
              key={step.id}
              className={`sequence-mini-timeline__step${isDone ? ' sequence-mini-timeline__step--done' : ''}`}
            >
              {/* Bouton "fait" : tap sur toute la carte */}
              <button
                type="button"
                className="sequence-mini-timeline__step-btn"
                onClick={() => toggleDone(step.id)}
                aria-pressed={isDone}
                aria-label={isDone ? `${label} — fait` : label}
              >
                {/* Image */}
                <div className="sequence-mini-timeline__step-image-wrapper">
                  {card?.image_url ? (
                    <SignedImage
                      filePath={card.image_url}
                      alt={label}
                      bucket={imageBucket}
                      className="sequence-mini-timeline__step-image"
                      size={80}
                    />
                  ) : (
                    <div
                      className="sequence-mini-timeline__step-placeholder"
                      aria-hidden="true"
                    >
                      📋
                    </div>
                  )}

                  {/* Overlay "fait" */}
                  {isDone && (
                    <div
                      className="sequence-mini-timeline__done-overlay"
                      aria-hidden="true"
                    >
                      ✓
                    </div>
                  )}
                </div>

                {/* Nom */}
                <span className="sequence-mini-timeline__step-label">
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default SequenceMiniTimeline
