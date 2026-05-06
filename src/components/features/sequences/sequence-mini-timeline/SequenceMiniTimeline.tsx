'use client'

/**
 * SequenceMiniTimeline — Modal overlay des sous-étapes d'une séquence (contexte Tableau, enfant).
 *
 * S'ouvre en modal au-dessus du Tableau. Affiche les étapes dans l'ordre,
 * chacune pouvant être marquée "fait" par tap (état local-only).
 *
 * ⚠️ ÉTAT LOCAL-ONLY
 * - L'état "fait" de chaque étape N'EST PAS persisté en DB.
 * - Il se remet à zéro à chaque session (monté/démonté avec la carte).
 * - Aucun lien avec la validation de la carte mère (SlotCard).
 *
 * ⚠️ RÈGLES TSA
 * - Interface calme, prévisible.
 * - Modal avec transition douce ≤ 0.3s (gérée par Modal.scss).
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

import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button, ButtonClose, Modal, SignedImage } from '@/components'
import type { SequenceStep } from '@/hooks/useSequenceSteps'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import './SequenceMiniTimeline.scss'

interface SequenceMiniTimelineProps {
  /** Contrôle l'ouverture du modal */
  isOpen: boolean
  /** Chargement en cours des étapes de séquence */
  loading?: boolean
  /** Étapes de la séquence (triées par position ASC) */
  steps: SequenceStep[]
  /** État local "fait" conservé par le parent tant que le slot vit */
  doneStepIds: Set<string>
  /** Toggle local d'une étape */
  onToggleDone: (stepId: string) => void
  /** Cartes banque disponibles (pour afficher l'image + le nom des étapes) */
  bankCards: BankCard[]
  /** Cartes personnelles disponibles */
  personalCards: PersonalCard[]
  /** Callback de fermeture */
  onClose: () => void
  /** Carte mère de la séquence — affichée en mini dans l'en-tête du modal */
  motherCard: BankCard | PersonalCard | null
}

export function SequenceMiniTimeline({
  isOpen,
  loading = false,
  steps,
  doneStepIds,
  onToggleDone,
  bankCards,
  personalCards,
  onClose,
  motherCard,
}: SequenceMiniTimelineProps) {
  const findCard = (cardId: string): BankCard | PersonalCard | null =>
    bankCards.find(c => c.id === cardId) ??
    personalCards.find(c => c.id === cardId) ??
    null

  const motherBucket: 'bank-images' | 'personal-images' = bankCards.some(
    c => c.id === motherCard?.id
  )
    ? 'bank-images'
    : 'personal-images'

  const motherName = motherCard?.name ?? 'Séquence'
  const completedCount = doneStepIds.size

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      size="large"
      className="sequence-mini-timeline-modal"
      overlayClassName="sequence-mini-timeline-overlay"
      closeOnOverlay={true}
      closeOnEscape={true}
    >
      {/* En-tête custom : mini-image carte mère + titre + sous-titre + fermeture */}
      <div className="sequence-mini-timeline__header">
        {/* Mini-image de la carte mère (remplace le badge icône du modèle de référence) */}
        <div className="sequence-mini-timeline__mother-mini" aria-hidden="true">
          {motherCard?.image_url ? (
            <SignedImage
              filePath={motherCard.image_url}
              alt=""
              bucket={motherBucket}
              className="sequence-mini-timeline__mother-image"
              size={80}
            />
          ) : (
            <div className="sequence-mini-timeline__mother-placeholder">📋</div>
          )}
        </div>

        {/* Titre + sous-titre */}
        <div className="sequence-mini-timeline__header-text">
          <h2
            className="sequence-mini-timeline__title"
            id="seq-mini-timeline-title"
          >
            {motherName}
          </h2>
          <p className="sequence-mini-timeline__subtitle">
            {completedCount} sur {steps.length} étape
            {steps.length > 1 ? 's' : ''}
          </p>
        </div>

        <ButtonClose
          onClick={onClose}
          size="modal"
          ariaLabel="Fermer les étapes"
        />
      </div>

      {/* Corps : liste des étapes */}
      {loading ? (
        <div
          className="sequence-mini-timeline__loading"
          aria-busy="true"
          aria-label="Préparation des étapes"
        >
          <p>Préparation des étapes…</p>
        </div>
      ) : (
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
              <Fragment key={step.id}>
              <li
                className={`sequence-mini-timeline__step${isDone ? ' sequence-mini-timeline__step--done' : ''}`}
              >
                {/* Tap sur toute la carte = marque "fait" */}
                <Button
                  variant="default"
                  className="sequence-mini-timeline__step-btn"
                  onClick={() => onToggleDone(step.id)}
                  aria-pressed={isDone}
                  aria-label={isDone ? `${label} — fait` : label}
                >
                  {/* Badge numéro — positionné en absolu, partiellement en dehors de l'image */}
                  <span
                    className="sequence-mini-timeline__step-number"
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>

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

                  {/* Nom de l'étape */}
                  <span className="sequence-mini-timeline__step-label">
                    {label}
                  </span>
                </Button>
              </li>
              {/* Séparateur "›" entre les étapes (sauf après la dernière) */}
              {idx < steps.length - 1 && (
                <li
                  className="sequence-mini-timeline__separator"
                  aria-hidden="true"
                >
                  <ChevronRight className="sequence-mini-timeline__chevron" />
                </li>
              )}
              </Fragment>
            )
          })}
        </ol>
      )}
    </Modal>
  )
}

export default SequenceMiniTimeline
