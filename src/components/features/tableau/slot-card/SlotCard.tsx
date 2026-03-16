'use client'

// src/components/features/tableau/slot-card/SlotCard.tsx
// Affichage d'un slot étape en Tableau (contexte enfant)
//
// ⚠️ Règles Contexte Tableau (§6.2)
// - ZÉRO message technique, réseau, quota, erreur DB
// - Interface calme, prévisible, TSA-friendly
// - Cibles tactiles ≥ 44px
// - Seuls les slots avec card_id NOT NULL sont affichés (filtrés par le parent)
//
// ⚠️ Validation idempotente
// - Un slot déjà validé reste coché mais la checkbox est désactivée
// - Pas de "décocher" en Tableau (la progression ne régresse jamais)
// - Session terminée → tous les slots sont en lecture seule
//
// ⚠️ Mini-timeline séquence (S7 — §3.1.4)
// - Bouton "Voir étapes" visible UNIQUEMENT sur la carte en focus (active)
// - La mini-timeline se referme quand la carte est validée
// - L'état "fait" des étapes est LOCAL-ONLY — jamais persisté en DB

import Image from 'next/image'
import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import type { Slot } from '@/hooks/useSlots'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import type { SequenceStep } from '@/hooks/useSequenceSteps'
import { SequenceMiniTimeline } from '@/components/features/sequences'
import { resolveStorageImageUrl } from '@/utils/storage/resolveStorageImageUrl'
import './SlotCard.scss'

interface SlotCardProps {
  slot: Slot
  /** Carte associée (banque ou personnelle) — obligatoire (les slots vides sont filtrés avant) */
  card: BankCard | PersonalCard | null
  /** Ce slot est-il déjà validé ? */
  validated: boolean
  /** La session est-elle terminée ? (lecture seule) */
  sessionCompleted: boolean
  /** Callback de validation — appelé quand l'enfant coche la case */
  onValidate: (slotId: string) => void
  // ── S7 : Séquence (optionnel) ──────────────────────────────────────────────
  /** Cette carte est-elle la carte "active" (focus) ? Détermine si "Voir étapes" est visible */
  isActive?: boolean
  /** Une séquence existe pour cette carte, même si ses étapes chargent encore */
  hasSequence?: boolean
  /** Étapes de la séquence associée à cette carte (vide = pas de séquence) */
  sequenceSteps?: SequenceStep[]
  /** Chargement des étapes de la séquence */
  sequenceStepsLoading?: boolean
  /** Cartes banque pour affichage dans la mini-timeline */
  bankCards?: BankCard[]
  /** Cartes personnelles pour affichage dans la mini-timeline */
  personalCards?: PersonalCard[]
}

export function SlotCard({
  slot,
  card,
  validated,
  sessionCompleted,
  onValidate,
  isActive = false,
  hasSequence = false,
  sequenceSteps = [],
  sequenceStepsLoading = false,
  bankCards = [],
  personalCards = [],
}: SlotCardProps) {
  const isDisabled = validated || sessionCompleted

  // État local : mini-timeline ouverte ou non (local-only)
  const [miniTimelineOpen, setMiniTimelineOpen] = useState(false)
  const [doneStepIds, setDoneStepIds] = useState<Set<string>>(() => new Set())
  const [resolvedImageSrc, setResolvedImageSrc] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const run = async () => {
      if (!card?.image_url) {
        if (active) setResolvedImageSrc(null)
        return
      }

      const src = await resolveStorageImageUrl(card.image_url, {
        bucket: card.type === 'bank' ? 'bank-images' : 'personal-images',
      })

      if (active) setResolvedImageSrc(src)
    }

    void run()

    return () => {
      active = false
    }
  }, [card?.image_url, card?.type])

  useEffect(() => {
    if (validated) {
      setDoneStepIds(new Set())
    }
  }, [validated])

  const handleToggleDone = useCallback((stepId: string) => {
    setDoneStepIds(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }, [])

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (isDisabled) return
      // Fermer la mini-timeline quand la carte est validée (§3.1.4)
      setMiniTimelineOpen(false)
      setDoneStepIds(new Set())
      onValidate(slot.id)
    },
    [isDisabled, onValidate, slot.id]
  )

  const cardLabel = card?.name ?? 'Étape'
  return (
    <article
      className={`slot-card${validated ? ' slot-card--validated' : ''}`}
      aria-label={`${cardLabel}${validated ? ' (terminé)' : ''}`}
    >
      {/* Image de la carte */}
      <div className="slot-card__image-wrapper">
        {resolvedImageSrc ? (
          <Image
            src={resolvedImageSrc}
            alt={cardLabel}
            className="slot-card__image"
            width={200}
            height={200}
            sizes="(max-width: 768px) 120px, 160px"
            placeholder="empty"
            unoptimized
            draggable={false}
          />
        ) : (
          <div className="slot-card__image-placeholder" aria-hidden="true">
            📋
          </div>
        )}

        {/* Indicateur "fait" — superposé sur l'image quand validé */}
        {validated && (
          <div className="slot-card__done-overlay" aria-hidden="true">
            ✓
          </div>
        )}
      </div>

      {/* Nom de la carte */}
      <p className="slot-card__label">{cardLabel}</p>

      {/* Bouton "Voir étapes" — visible si carte active ET séquence présente ET non validée (§3.1.4) */}
      {isActive && hasSequence && !validated && (
        <button
          type="button"
          className={`slot-card__sequence-toggle${miniTimelineOpen ? ' slot-card__sequence-toggle--open' : ''}`}
          onClick={() => setMiniTimelineOpen(o => !o)}
          aria-expanded={miniTimelineOpen}
          aria-controls={`sequence-${slot.id}`}
          aria-label={
            miniTimelineOpen ? 'Masquer les étapes' : 'Voir les étapes'
          }
        >
          {miniTimelineOpen ? 'Masquer les étapes' : 'Voir les étapes 📋'}
        </button>
      )}

      {/* Mini-timeline (visible uniquement si bouton ouvert) */}
      {miniTimelineOpen && hasSequence && (
        <div id={`sequence-${slot.id}`}>
          <SequenceMiniTimeline
            loading={sequenceStepsLoading}
            steps={sequenceSteps}
            doneStepIds={doneStepIds}
            onToggleDone={handleToggleDone}
            bankCards={bankCards}
            personalCards={personalCards}
            onClose={() => setMiniTimelineOpen(false)}
          />
        </div>
      )}

      {/* Bouton de validation (checkbox agrandie pour enfants TSA) */}
      <button
        type="button"
        className={`slot-card__check${validated ? ' slot-card__check--done' : ''}`}
        onClick={handleClick}
        disabled={isDisabled}
        aria-pressed={validated}
        aria-label={
          validated ? `${cardLabel} est terminé` : `Valider ${cardLabel}`
        }
      >
        {validated ? '✓' : '○'}
      </button>
    </article>
  )
}
