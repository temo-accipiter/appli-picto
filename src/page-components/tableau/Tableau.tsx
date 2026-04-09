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
import useSequencesWithVisitor from '@/hooks/useSequencesWithVisitor'
import useSequenceStepsWithVisitor from '@/hooks/useSequenceStepsWithVisitor'
import { useReducedMotion } from '@/hooks'
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
import type { SequenceStep } from '@/hooks/useSequenceSteps'
import './Tableau.scss'

const COMPLETION_REVEAL_DELAY_MS = 1200
const COMPLETION_REVEAL_DELAY_REDUCED_MOTION_MS = 400

// ─── SlotCardWithSequence ────────────────────────────────────────────────────
// Wrapper qui charge les étapes de la séquence pour une carte donnée.
// Nécessaire car useSequenceSteps ne peut pas être appelé dans un .map().

interface SlotCardWithSequenceProps {
  slot: Slot
  card: BankCard | PersonalCard | null
  validated: boolean
  sessionCompleted: boolean
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
  sequence,
  bankCards,
  personalCards,
  onValidate,
}: SlotCardWithSequenceProps) {
  // Visitor → IndexedDB local-only, Auth → Supabase cloud
  const { steps: sequenceSteps, loading: sequenceStepsLoading } =
    useSequenceStepsWithVisitor(sequence?.id ?? null)

  // ✅ CORRECTIF SYMPTÔME A (Séquence fantôme) — Détection optimiste séquence manquante
  // Si un slot a une card_id MAIS sequence === null → race condition entre refreshSlots() et refreshSequences()
  // → Rafraîchir une seule fois pour charger la séquence manquante
  const { refresh: refreshSequences } = useSequencesWithVisitor()
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false)

  useEffect(() => {
    // Si slot.card_id existe MAIS sequence === null → séquence pas encore chargée
    // → Rafraîchir une seule fois pour éviter loop infini
    if (slot.card_id && !sequence && !hasAttemptedRefresh) {
      refreshSequences()
      setHasAttemptedRefresh(true)
    }
    // Reset flag si sequence devient non-null (résolution réussie)
    if (sequence && hasAttemptedRefresh) {
      setHasAttemptedRefresh(false)
    }
  }, [slot.card_id, sequence, hasAttemptedRefresh, refreshSequences])

  return (
    <SlotCard
      slot={slot}
      card={card}
      validated={validated}
      sessionCompleted={sessionCompleted}
      onValidate={onValidate}
      hasSequence={sequence !== null}
      sequenceSteps={sequenceSteps as SequenceStep[]}
      sequenceStepsLoading={
        sequenceStepsLoading || (!!slot.card_id && !sequence)
      }
      // ↑ Loading tant que séquence manquante (détection optimiste)
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

interface TableauProps {
  /** Mode démo/visiteur (conservé pour compatibilité tests) */
  isDemo?: boolean
  /** Callback changement de ligne (conservé pour compatibilité tests) */
  onLineChange?: (line: string) => void
}

export default function Tableau(_props: TableauProps = {}) {
  const { activeChildId } = useChildProfile()
  const { showTrain, showTimeTimer } = useDisplay()
  const prefersReducedMotion = useReducedMotion()
  // ── Chargement des données de base ─────────────────────────────────────────
  const { timeline, loading: timelineLoading } = useTimelines(activeChildId)
  const {
    slots,
    loading: slotsLoading,
    refresh: refreshSlots,
  } = useSlots(timeline?.id ?? null)
  const { cards: bankCards, loading: bankLoading } = useBankCards()
  const { cards: personalCards, loading: personalLoading } = usePersonalCards()

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

  // ── Séquences (S7) ─────────────────────────────────────────────────────────
  // ⚠️ CRITIQUE : Doit être déclaré AVANT le useEffect epoch (ligne 169+)
  // Chargement de toutes les séquences (cloud ou local selon Visitor).
  // Visitor → IndexedDB local-only, Auth → Supabase cloud
  // Chaque slot peut avoir une séquence liée à sa carte mère (via mother_card_id).
  const { sequences, refresh: refreshSequences } = useSequencesWithVisitor()

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

  // ── Epoch : suivi local pour détection de changements structurants ────────
  // Si l'epoch de la DB est supérieure à l'epoch connu localement,
  // un changement structurant a eu lieu (suppression carte, réinitialisation, etc.)
  // → refetch TOUTES les données (validations, slots, séquences) pour synchroniser
  //   l'état avec la structure DB actuelle
  const localEpochRef = useRef<number | null>(null)

  useEffect(() => {
    if (!session) return

    const isFirstLoad = localEpochRef.current === null
    const hasEpochChanged =
      !isFirstLoad && session.epoch > localEpochRef.current!

    // ✅ CORRECTIF COMPLET : Rafraîchir TOUTES les données au premier chargement (F5) ET lors changement epoch
    // Raison : Au F5, localEpochRef.current est réinitialisé à null (useRef non persistant entre pages).
    // Sans ce refresh explicite au premier chargement, les données peuvent ne pas être
    // synchronisées correctement avec la structure DB après un changement structurant
    // (ex: ajout/suppression slot → epoch++ → F5).
    //
    // BUG 1 (Séquence fantôme) : Si un slot ajouté en cours de session contient une séquence,
    //                             celle-ci ne s'affichait pas car sequences n'était pas refetché.
    // BUG 2 (Complétion têtue)  : Si un slot est ajouté en cours de session (epoch++),
    //                             visibleStepSlots restait figé → calcul complétion erroné côté UI.
    if (isFirstLoad || hasEpochChanged) {
      localEpochRef.current = session.epoch

      // Refetch TOUTES les données affectées par les changements structurants
      refreshValidations() // Validations existantes (préservées par Soft Sync)
      refreshSlots() // Slots actuels (nouveaux slots ajoutés via Édition)
      refreshSequences() // Séquences liées aux slots (nouvelles séquences ajoutées)
    }
  }, [session, refreshValidations, refreshSlots, refreshSequences])

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
  // §4.2 : la progression affichée utilise l'ensemble effectif (DB + optimiste offline)
  const validatedCount = effectiveValidatedSlotIds.size
  const isSessionCompleted = session?.state === 'completed'
  const [isCompletionRewardRevealed, setIsCompletionRewardRevealed] =
    useState(isSessionCompleted)
  const previousSessionCompletedRef = useRef(isSessionCompleted)

  // §4.5 : steps_total_snapshot est immuable pendant toute la session (figé à la 1ère validation).
  // La composition de la timeline est verrouillée dès active_started → snapshot = réalité.
  // Fallback visibleStepSlots.length uniquement pendant active_preview (snapshot encore null).
  const totalForProgress =
    session?.steps_total_snapshot ?? visibleStepSlots.length

  useEffect(() => {
    const wasCompleted = previousSessionCompletedRef.current
    previousSessionCompletedRef.current = isSessionCompleted

    if (!isSessionCompleted) {
      setIsCompletionRewardRevealed(false)
      return
    }

    if (!wasCompleted) {
      setIsCompletionRewardRevealed(false)

      const delay = prefersReducedMotion
        ? COMPLETION_REVEAL_DELAY_REDUCED_MOTION_MS
        : COMPLETION_REVEAL_DELAY_MS

      const timer = window.setTimeout(() => {
        setIsCompletionRewardRevealed(true)
      }, delay)

      return () => window.clearTimeout(timer)
    }

    setIsCompletionRewardRevealed(true)
  }, [isSessionCompleted, prefersReducedMotion])

  const shouldShowSessionComplete =
    isSessionCompleted && isCompletionRewardRevealed
  const rewardCard = rewardSlot
    ? findCard(rewardSlot.card_id, bankCards, personalCards)
    : null

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
        {/* TimeTimer indépendant des slots (préférences utilisateur) */}
        {showTimeTimer && <FloatingTimeTimer />}
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
                sessionCompleted={isSessionCompleted}
                sequence={sequence as Sequence | null}
                bankCards={bankCards}
                personalCards={personalCards}
                onValidate={handleValidate}
              />
            )
          })}
        </div>
      </section>

      {shouldShowSessionComplete && (
        <div
          className="tableau-magique__completion-overlay"
          data-testid="completion-overlay"
        >
          <section
            className="tableau-magique__completion-overlay-content"
            aria-labelledby="completion-heading"
          >
            <h2 id="completion-heading" className="sr-only">
              Fin de parcours
            </h2>
            <SessionComplete
              rewardSlot={rewardSlot}
              rewardCard={rewardCard}
              showTrain={false}
              totalSteps={totalForProgress}
              variant="overlay"
            />
          </section>
        </div>
      )}

      {/* Time Timer flottant */}
      {!isSessionCompleted && showTimeTimer && <FloatingTimeTimer />}
    </div>
  )
}
