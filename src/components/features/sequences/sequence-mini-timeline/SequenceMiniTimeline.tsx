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
import type { SequenceStep } from '@/hooks/useSequenceSteps'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import './SequenceMiniTimeline.scss'

interface SequenceMiniTimelineProps {
  /** Chargement en cours des étapes de séquence */
  loading?: boolean
  /** Étapes de la séquence (triées par position ASC) */
  steps: SequenceStep[]
  /** État local "fait" conservé par le parent tant que le slot vit */
  doneStepIds: Set<string>
  /** Toggle local d'une étape */
  onToggleDone: (stepId: string) => void
  /** Cartes banque disponibles (pour afficher l'image + le nom) */
  bankCards: BankCard[]
  /** Cartes personnelles disponibles */
  personalCards: PersonalCard[]
  /** Callback de fermeture (quand l'enfant clique sur "Fermer") */
  onClose: () => void
}

export function SequenceMiniTimeline({
  loading = false,
  steps,
  doneStepIds,
  onToggleDone,
  bankCards,
  personalCards,
  onClose,
}: SequenceMiniTimelineProps) {
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

      {loading ? (
        <div aria-busy="true" aria-label="Préparation des étapes">
          <p>Préparation des étapes…</p>
        </div>
      ) : (
        /* Liste horizontale scrollable */
        <ol
          className="sequence-mini-timeline__list"
          aria-label="Étapes à faire"
        >
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
                  onClick={() => onToggleDone(step.id)}
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
      )}
    </div>
  )
}

export default SequenceMiniTimeline
