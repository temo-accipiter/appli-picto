'use client'

// src/page-components/tableau/Tableau.tsx — S5/S7
// Contexte Tableau : sessions + validations + progression
//
// ⚠️ DB-FIRST STRICT
// - Création session automatique si aucune session active
// - Validations : INSERT idempotent → DB gère les transitions d'état
// - Progression : validations / steps_total_snapshot (jamais de recomptage live)
//
// ⚠️ Règles Contexte Tableau (§6.2)
// - ZÉRO message technique, réseau, quota, erreur DB visible par l'enfant
// - Interface calme, prévisible, TSA-friendly
// - Slots vides (card_id=null) : invisibles et ignorés dans la progression
//
// ⚠️ Règle anti-choc
// - Les changements structurants (édition adulte) ne s'appliquent qu'au prochain Chargement.
// - L'epoch est comparé à la valeur locale : si epoch_DB > epoch_local → réalignement au prochain Chargement.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChildProfile } from '@/contexts/ChildProfileContext'
import { useDisplay } from '@/contexts'
import { useOffline } from '@/contexts/OfflineContext'
import useSessions from '@/hooks/useSessions'
import useSessionValidations from '@/hooks/useSessionValidations'
import useTimelines from '@/hooks/useTimelines'
import useSlots from '@/hooks/useSlots'
import useBankCards from '@/hooks/useBankCards'
import usePersonalCards from '@/hooks/usePersonalCards'
import useSequences from '@/hooks/useSequences'
import useSequenceSteps from '@/hooks/useSequenceSteps'
import { TrainProgressBar, FloatingTimeTimer } from '@/components'
import {
  SlotCard,
  TokensGrid,
  SessionComplete,
} from '@/components/features/tableau'
import type { Slot } from '@/hooks/useSlots'
import type { BankCard } from '@/hooks/useBankCards'
import type { PersonalCard } from '@/hooks/usePersonalCards'
import type { Sequence } from '@/hooks/useSequences'
import './Tableau.scss'

// ─── SlotCardWithSequence ────────────────────────────────────────────────────
// Wrapper qui charge les étapes de la séquence pour une carte donnée.
// Nécessaire car useSequenceSteps ne peut pas être appelé dans un .map().

interface SlotCardWithSequenceProps {
  slot: Slot
  card: BankCard | PersonalCard | null
  validated: boolean
  sessionCompleted: boolean
  isActive: boolean
  sequence: Sequence | null
  bankCards: BankCard[]
  personalCards: PersonalCard[]
  onValidate: (slotId: string) => void
}

function SlotCardWithSequence({
  slot,
  card,
  validated,
  sessionCompleted,
  isActive,
  sequence,
  bankCards,
  personalCards,
  onValidate,
}: SlotCardWithSequenceProps) {
  const { steps: sequenceSteps } = useSequenceSteps(sequence?.id ?? null)

  return (
    <SlotCard
      slot={slot}
      card={card}
      validated={validated}
      sessionCompleted={sessionCompleted}
      onValidate={onValidate}
      isActive={isActive}
      sequenceSteps={sequenceSteps}
      bankCards={bankCards}
      personalCards={personalCards}
    />
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cherche une carte par card_id dans la banque + cartes personnelles */
function findCard(
  cardId: string | null,
  bankCards: BankCard[],
  personalCards: PersonalCard[]
): BankCard | PersonalCard | null {
  if (!cardId) return null
  return (
    bankCards.find(c => c.id === cardId) ??
    personalCards.find(c => c.id === cardId) ??
    null
  )
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function Tableau() {
  const { activeChildId } = useChildProfile()
  const { showTrain, showTimeTimer } = useDisplay()
  // ── Chargement des données de base ─────────────────────────────────────────
  const { timeline, loading: timelineLoading } = useTimelines(activeChildId)
  const { slots, loading: slotsLoading } = useSlots(timeline?.id ?? null)
  const { cards: bankCards, loading: bankLoading } = useBankCards()
  const { cards: personalCards, loading: personalLoading } = usePersonalCards(
    activeChildId ?? null
  )

  // ── Session active ──────────────────────────────────────────────────────────
  const {
    session,
    loading: sessionLoading,
    createSession,
    refresh: refreshSession,
  } = useSessions(activeChildId, timeline?.id ?? null)

  // ── Validations ─────────────────────────────────────────────────────────────
  const {
    validatedSlotIds,
    validate,
    refresh: refreshValidations,
  } = useSessionValidations(session?.id ?? null)

  // ── S8 : Gestion offline (§4.4) ─────────────────────────────────────────
  // isOnline : détecté via OfflineContext (propagé depuis navigator.onLine)
  // enqueueValidation : met en queue locale quand offline
  //
  // ⚠️ RÈGLE §6.2 : aucune information réseau visible par l'enfant
  //    → isOnline n'est utilisé QUE pour la logique (queue/sync), jamais affiché
  const { isOnline, enqueueValidation } = useOffline()

  // Validations optimistes locales : slot_id cochés offline avant sync
  // Réinitialisés au retour réseau (les vraies validations DB prennent le relais)
  const [localOptimisticSlotIds, setLocalOptimisticSlotIds] = useState<
    Set<string>
  >(() => new Set())

  // Au retour réseau : vider les optimistics et rafraîchir depuis DB
  const prevIsOnlineRef = useRef(isOnline)
  useEffect(() => {
    const wasOffline = !prevIsOnlineRef.current
    prevIsOnlineRef.current = isOnline

    if (wasOffline && isOnline) {
      // La queue a été flushée par OfflineContext automatiquement.
      // On rafraîchit les validations depuis la DB (fusion monotone §4.2).
      refreshValidations()
      setLocalOptimisticSlotIds(new Set())
    }
  }, [isOnline, refreshValidations])

  // ── Epoch : suivi local pour détection de réinitialisation ─────────────────
  // Si l'epoch de la DB est supérieure à l'epoch connu localement,
  // la session a été réinitialisée par l'adulte → réalignement au prochain Chargement.
  const localEpochRef = useRef<number | null>(null)

  useEffect(() => {
    if (!session) return
    if (localEpochRef.current === null) {
      // Premier chargement → mémoriser l'epoch initial
      localEpochRef.current = session.epoch
    } else if (session.epoch > localEpochRef.current) {
      // L'epoch a augmenté : session réinitialisée par l'adulte
      // Anti-choc : on met à jour le ref local mais on ne "choque" pas l'UI
      // → le prochain Chargement du Contexte Tableau affichera la session fraîche
      localEpochRef.current = session.epoch
    }
  }, [session])

  // ── Création automatique de session ────────────────────────────────────────
  // Si la timeline est chargée, que la session est absente et que les données sont prêtes
  // → créer une session 'active_preview' automatiquement.
  const hasAttemptedCreate = useRef(false)

  useEffect(() => {
    const dataReady = !timelineLoading && !sessionLoading && !slotsLoading
    const noSession =
      dataReady && timeline && session === null && !sessionLoading

    if (noSession && !hasAttemptedCreate.current) {
      hasAttemptedCreate.current = true
      void createSession()
    }

    // Reset si nouvelle timeline (changement d'enfant)
    if (!timeline) {
      hasAttemptedCreate.current = false
    }
  }, [
    timeline,
    session,
    timelineLoading,
    sessionLoading,
    slotsLoading,
    createSession,
  ])

  // ── Ensemble effectif des validations (DB ∪ local optimiste offline) ────────
  // §4.2 : fusion monotone — la progression ne peut jamais régresser.
  // Quand offline : les validations locales s'ajoutent aux validations DB connues.
  // Quand online : la DB a la vérité, les locales sont vidées après sync.
  const effectiveValidatedSlotIds = useMemo<Set<string>>(
    () =>
      localOptimisticSlotIds.size > 0
        ? new Set([...validatedSlotIds, ...localOptimisticSlotIds])
        : validatedSlotIds,
    [validatedSlotIds, localOptimisticSlotIds]
  )

  // ── Rafraîchissement après validation (pour MAJ état session) ───────────────
  // Après chaque validation, on rafraîchit la session pour détecter les transitions
  // (active_preview → active_started → completed gérées côté DB)
  //
  // S8 : Si offline → mise à jour optimiste locale + queue (§4.4)
  //      Si online  → comportement normal (DB + refresh)
  const handleValidate = useCallback(
    async (slotId: string) => {
      if (!isOnline) {
        // Offline : mise à jour optimiste locale immédiate (TSA — pas de friction)
        setLocalOptimisticSlotIds(prev => new Set([...prev, slotId]))

        // Mise en queue pour sync au retour réseau
        if (session?.id) {
          enqueueValidation(session.id, slotId)
        }
        return
      }

      // Online : validation DB normale
      const { error } = await validate(slotId)
      if (!error) {
        // Rafraîchir la session pour capturer les transitions d'état DB
        refreshSession()
      }
    },
    [isOnline, validate, refreshSession, session?.id, enqueueValidation]
  )

  // ── Slots filtrés pour l'affichage Tableau ─────────────────────────────────
  // §3.1.1 : Slots vides (card_id = null) sont invisibles en Tableau
  // §3.1 : Seules les étapes (kind='step') sont validables
  const visibleStepSlots = useMemo<Slot[]>(
    () =>
      slots.filter((s): s is Slot => s.kind === 'step' && s.card_id !== null),
    [slots]
  )

  // Slot récompense (1 seul, kind='reward', avec carte assignée)
  const rewardSlot = useMemo<Slot | null>(
    () => slots.find(s => s.kind === 'reward' && s.card_id !== null) ?? null,
    [slots]
  )

  // ── Progression ─────────────────────────────────────────────────────────────
  // §4.5 : La progression utilise steps_total_snapshot (immuable).
  // JAMAIS de recomptage live des slots.
  const snapshot = session?.steps_total_snapshot ?? null
  // §4.2 : la progression affichée utilise l'ensemble effectif (DB + optimiste offline)
  const validatedCount = effectiveValidatedSlotIds.size
  const isSessionCompleted = session?.state === 'completed'

  // Si snapshot non encore fixé (active_preview) → utiliser les slots visibles comme estimation
  // (sera remplacé par le snapshot DB dès la 1ère validation)
  const totalForProgress = snapshot ?? visibleStepSlots.length

  // ── Séquences (S7) ─────────────────────────────────────────────────────────
  // Chargement de toutes les séquences du compte.
  // Chaque slot peut avoir une séquence liée à sa carte mère (via mother_card_id).
  const { sequences } = useSequences()

  // La carte "active" = le premier slot visible non encore validé (§3.1.4).
  // C'est uniquement sur cette carte que le bouton "Voir étapes" est affiché.
  // §4.2 : utilise l'ensemble effectif (DB + optimiste offline)
  const activeSlotId = useMemo<string | null>(() => {
    const firstNotValidated = visibleStepSlots.find(
      s => !effectiveValidatedSlotIds.has(s.id)
    )
    return firstNotValidated?.id ?? null
  }, [visibleStepSlots, effectiveValidatedSlotIds])

  // ── Calcul des jetons ───────────────────────────────────────────────────────
  // §3.1.2 : Somme des tokens des étapes validées (non-vides uniquement)
  // §4.2 : utilise l'ensemble effectif (DB + optimiste offline)
  const earnedTokens = useMemo(() => {
    let count = 0
    for (const slot of visibleStepSlots) {
      if (effectiveValidatedSlotIds.has(slot.id)) {
        count += slot.tokens ?? 0
      }
    }
    return count
  }, [visibleStepSlots, effectiveValidatedSlotIds])

  const totalTokens = useMemo(() => {
    return visibleStepSlots.reduce((sum, slot) => sum + (slot.tokens ?? 0), 0)
  }, [visibleStepSlots])

  // ── Chargement global ───────────────────────────────────────────────────────
  const isLoading =
    timelineLoading ||
    sessionLoading ||
    slotsLoading ||
    bankLoading ||
    personalLoading

  // ── Rendu : état de chargement ──────────────────────────────────────────────
  // TSA : indicateur de chargement calme, sans texte technique
  if (isLoading) {
    return (
      <div className="tableau-magique" aria-busy="true" aria-label="Chargement">
        <div className="tableau-magique__loading">
          <div className="tableau-magique__dot" />
          <div className="tableau-magique__dot" />
          <div className="tableau-magique__dot" />
        </div>
      </div>
    )
  }

  // ── Rendu : pas de timeline configurée ─────────────────────────────────────
  // TSA : message simple et positif, sans termes techniques
  if (!timeline || visibleStepSlots.length === 0) {
    return (
      <div className="tableau-magique">
        <div className="tableau-magique__empty">
          <span className="tableau-magique__empty-icon" aria-hidden="true">
            📋
          </span>
          <p className="tableau-magique__empty-text">
            La journée n&apos;est pas encore préparée.
          </p>
        </div>
      </div>
    )
  }

  // ── Rendu : session terminée ────────────────────────────────────────────────
  if (isSessionCompleted) {
    const rewardCard = rewardSlot
      ? findCard(rewardSlot.card_id, bankCards, personalCards)
      : null

    return (
      <div className="tableau-magique">
        <h1 className="sr-only">Tableau de la journée</h1>
        <SessionComplete rewardSlot={rewardSlot} rewardCard={rewardCard} />
      </div>
    )
  }

  // ── Rendu principal ─────────────────────────────────────────────────────────
  return (
    <div className="tableau-magique">
      {/* Accessible : titre pour lecteurs d'écran */}
      <h1 className="sr-only">Tableau de la journée</h1>

      {/* Barre de progression (train) */}
      {showTrain && (
        <section aria-labelledby="progress-heading">
          <h2 id="progress-heading" className="sr-only">
            Progression
          </h2>
          <TrainProgressBar total={totalForProgress} done={validatedCount} />
        </section>
      )}

      {/* Grille de jetons */}
      {totalTokens > 0 && (
        <section aria-labelledby="tokens-heading">
          <h2 id="tokens-heading" className="sr-only">
            Jetons gagnés
          </h2>
          <TokensGrid earnedTokens={earnedTokens} totalTokens={totalTokens} />
        </section>
      )}

      {/* Liste des étapes (slots step avec carte) */}
      <section
        className="tableau-magique__slots"
        aria-labelledby="steps-heading"
      >
        <h2 id="steps-heading" className="sr-only">
          Étapes de la journée
        </h2>
        <div className="tableau-magique__slots-list">
          {visibleStepSlots.map(slot => {
            const card = findCard(slot.card_id, bankCards, personalCards)
            const isValidated = effectiveValidatedSlotIds.has(slot.id)
            // Séquence liée à cette carte (0..1 séquence par mother_card_id)
            const sequence = slot.card_id
              ? (sequences.find(s => s.mother_card_id === slot.card_id) ?? null)
              : null

            return (
              <SlotCardWithSequence
                key={slot.id}
                slot={slot}
                card={card}
                validated={isValidated}
                sessionCompleted={false}
                isActive={slot.id === activeSlotId}
                sequence={sequence}
                bankCards={bankCards}
                personalCards={personalCards}
                onValidate={handleValidate}
              />
            )
          })}
        </div>
      </section>

      {/* Time Timer flottant */}
      {showTimeTimer && <FloatingTimeTimer />}
    </div>
  )
}
