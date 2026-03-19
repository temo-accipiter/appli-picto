'use client'

/**
 * SlotsEditor — Éditeur de la liste des slots d'une timeline.
 *
 * Affiche :
 * - La liste ordonnée des slots (étapes + récompenses)
 * - Des boutons pour ajouter une étape ou une récompense
 * - Un bouton "Réinitialiser la session" avec confirmation 1-clic (S6)
 * - Un état vide si aucun slot
 * - Les erreurs DB (refus de suppression du dernier slot, etc.)
 *
 * ⚠️ RÈGLES TSA
 * - Interface claire et prévisible.
 * - Messages d'erreur simples, non techniques.
 * - Cibles tactiles ≥ 44px.
 * - Transitions douces ≤ 0.3s.
 * - Toutes les confirmations : inline 1 clic (pas de modale).
 *
 * ⚠️ RÈGLES DB-FIRST
 * - "Réinitialiser la session" = reset progression via fonction DB existante
 * - Les cartes banque/perso sont chargées ici (une seule requête) et transmises
 *   à chaque SlotItem (évite N requêtes parallèles).
 *
 * ⚠️ MATRICE DE VERROUILLAGE S6 (§3.2.2bis)
 * - sessionState + validatedSlotIds transmis à chaque SlotItem.
 * - Le verrouillage est appliqué dans SlotItem, pas ici.
 */

import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import useAccountStatus from '@/hooks/useAccountStatus'
import type { Slot } from '@/hooks/useSlots'
import type { SessionState } from '@/hooks/useSessions'
import useBankCards from '@/hooks/useBankCards'
import usePersonalCards from '@/hooks/usePersonalCards'
import useSequencesWithVisitor from '@/hooks/useSequencesWithVisitor'
import { Modal } from '@/components'
import { SequenceEditor } from '@/components/features/sequences'
import { SlotItem } from '../slot-item/SlotItem'
import './SlotsEditor.scss'

interface SlotsEditorProps {
  slots: Slot[]
  /** Chargement des slots en cours */
  loading?: boolean
  /** Erreur de lecture */
  error?: Error | null
  /** Ajouter une étape */
  onAddStep: () => Promise<{ error: Error | null }>
  /** Ajouter une récompense */
  onAddReward: () => Promise<{ error: Error | null }>
  /** Modifier un slot (card_id et/ou tokens) */
  onUpdateSlot: (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => Promise<{ error: Error | null }>
  /** Supprimer un slot */
  onRemoveSlot: (id: string) => Promise<{ error: Error | null }>
  // ── S6 : Verrouillage + Réinitialisation ─────────────────────────────────
  /**
   * État de la session active pour ce profil+timeline.
   * null = aucune session ou terminée → tout éditable.
   */
  sessionState?: SessionState | null
  /**
   * Ensemble des slot_id validés dans la session en cours.
   * Utilisé pour savoir si un slot est validé (matrice §3.2.2bis).
   */
  validatedSlotIds?: Set<string>
  /**
   * Réinitialiser la progression de session via la fonction DB dédiée.
   */
  onResetSession: () => Promise<{ error: Error | null }>
  /** Le reset est-il actuellement autorisé ? */
  canResetSession?: boolean
  /**
   * S8 : Désactiver toutes les actions structurelles si le navigateur est offline.
   * §4.4 : CRUD structure interdit offline (guard UX).
   */
  isOffline?: boolean
  /**
   * S9 : Désactiver toutes les actions structurelles si le compte est en mode
   * exécution-uniquement (downgrade Subscriber → Free, §9).
   * §6.1 catégorie #8 : CRUD structure interdit, exécution (sessions, validations) autorisée.
   */
  isExecutionOnly?: boolean
}

export function SlotsEditor({
  slots,
  loading = false,
  error = null,
  onAddStep,
  onAddReward,
  onUpdateSlot,
  onRemoveSlot,
  sessionState = null,
  validatedSlotIds,
  onResetSession,
  canResetSession = false,
  isOffline = false,
  isExecutionOnly = false,
}: SlotsEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const [swappingCards, setSwappingCards] = useState(false)
  const [addingStep, setAddingStep] = useState(false)
  const [addingReward, setAddingReward] = useState(false)
  const [resettingSession, setResettingSession] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [optimisticSlots, setOptimisticSlots] = useState<Slot[] | null>(null)
  const [activeDragSlotId, setActiveDragSlotId] = useState<string | null>(null)
  const [activeSequenceSlot, setActiveSequenceSlot] = useState<Slot | null>(
    null
  )

  // Chargement des cartes une seule fois, transmises à chaque SlotItem
  const { cards: bankCards, refresh: refreshBankCards } = useBankCards()
  const { cards: personalCards, refresh: refreshPersonalCards } =
    usePersonalCards()
  const {
    loading: accountStatusLoading,
    isSubscriber,
    isAdmin,
  } = useAccountStatus()
  const lastMissingSignatureRef = useRef('')

  // ── S6 : Map de refs pour gestion focus post-suppression (§3.2.2bis) ──────
  // Stocke les refs DOM des SlotItem pour permettre le focus programmatique
  const slotRefsMap = useRef<Map<string, HTMLLIElement>>(new Map())

  // Callback pour enregistrer/dés-enregistrer les refs des SlotItem
  const setSlotRef = useCallback((id: string, node: HTMLLIElement | null) => {
    if (node) {
      slotRefsMap.current.set(id, node)
    } else {
      slotRefsMap.current.delete(id)
    }
  }, [])

  // Chargement des séquences (S7 — cloud ou local selon Visitor)
  // Visitor → IndexedDB local-only, Auth → Supabase cloud
  const { sequences, createSequence, deleteSequence, isVisitorSource } =
    useSequencesWithVisitor()
  const canWriteCloudSequences = (isSubscriber || isAdmin) && !isExecutionOnly
  const canCreateSequence = isVisitorSource || canWriteCloudSequences
  const isSequenceReadOnly = !isVisitorSource && !canWriteCloudSequences
  const sequenceCreationAvailabilityLoading =
    !isVisitorSource && accountStatusLoading

  useEffect(() => {
    setOptimisticSlots(null)
  }, [slots])

  useEffect(() => {
    if (!canResetSession) {
      setConfirmReset(false)
    }
  }, [canResetSession])

  useEffect(() => {
    if (!activeSequenceSlot) return

    const currentActiveSlot = slots.find(
      slot => slot.id === activeSequenceSlot.id
    )
    if (
      !currentActiveSlot ||
      currentActiveSlot.kind !== 'step' ||
      !currentActiveSlot.card_id
    ) {
      setActiveSequenceSlot(null)
    }
  }, [activeSequenceSlot, slots])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleCardsChanged = () => {
      refreshBankCards()
      refreshPersonalCards()
    }

    window.addEventListener('cards:changed', handleCardsChanged)
    return () => window.removeEventListener('cards:changed', handleCardsChanged)
  }, [refreshBankCards, refreshPersonalCards])

  // Après création/assignation d'une nouvelle carte, ce composant peut avoir
  // un cache local périmé (hook distinct de l'édition des cartes).
  // On déclenche un refresh ciblé si un slot référence une carte introuvable.
  useEffect(() => {
    const missingIds = slots
      .map(s => s.card_id)
      .filter((id): id is string => Boolean(id))
      .filter(
        id =>
          !bankCards.some(card => card.id === id) &&
          !personalCards.some(card => card.id === id)
      )

    if (missingIds.length === 0) {
      lastMissingSignatureRef.current = ''
      return
    }

    const signature = [...missingIds].sort().join('|')
    if (signature === lastMissingSignatureRef.current) return

    lastMissingSignatureRef.current = signature
    refreshBankCards()
    refreshPersonalCards()
  }, [slots, bankCards, personalCards, refreshBankCards, refreshPersonalCards])

  /** Traduction des refus DB en message UX neutre */
  function dbErrorToMessage(err: Error | null): string {
    if (!err) return ''
    const msg = err.message?.toLowerCase() ?? ''
    if (msg.includes('step') && msg.includes('min')) {
      return 'La timeline doit avoir au moins une étape.'
    }
    if (msg.includes('reward') && msg.includes('min')) {
      return 'La timeline doit avoir au moins une récompense.'
    }
    if (msg.includes('pas de timeline') || msg.includes('timeline active')) {
      return 'Chargement du profil enfant en cours. Réessaie dans un instant.'
    }
    if (msg.includes('aucun profil')) {
      return 'Aucun profil enfant disponible.'
    }
    return 'Une erreur est survenue. Réessaie.'
  }

  const handleAddStep = async () => {
    setAddingStep(true)
    setActionError(null)
    const { error: err } = await onAddStep()
    setAddingStep(false)
    if (err) setActionError(dbErrorToMessage(err))
  }

  const handleAddReward = async () => {
    setAddingReward(true)
    setActionError(null)
    const { error: err } = await onAddReward()
    setAddingReward(false)
    if (err) setActionError(dbErrorToMessage(err))
  }

  const handleRemove = async (id: string) => {
    // ── S6 : Focus post-suppression (§3.2.2bis — UX TSA anti-choc) ────────────
    // AVANT suppression : calculer prochain slot à focus
    const remainingSlots = displayedSlots.filter(s => s.id !== id)

    // Trouver prochaine étape non validée
    const nextSlot =
      remainingSlots.find(
        s => s.kind === 'step' && !validatedSlotIds?.has(s.id)
      ) ?? remainingSlots.find(s => s.kind === 'reward') // fallback récompense

    setBusyId(id)
    setActionError(null)
    const { error: err } = await onRemoveSlot(id)
    setBusyId(null)

    if (err) {
      setActionError(dbErrorToMessage(err))
      return
    }

    // APRÈS suppression réussie : focus prochain slot
    // Timeout 100ms laisse le DOM se stabiliser après suppression
    if (nextSlot) {
      setTimeout(() => {
        const element = slotRefsMap.current.get(nextSlot.id)
        element?.focus()
        element?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }, 100)
    }
  }

  const handleResetSession = async () => {
    if (!canResetSession) return
    // Premier clic → demande confirmation
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    // Deuxième clic → exécute
    setConfirmReset(false)
    setResettingSession(true)
    setActionError(null)
    const { error: err } = await onResetSession()
    setResettingSession(false)
    if (err) setActionError('Impossible de réinitialiser la session. Réessaie.')
  }

  // §4.4 S8 : Actions structurelles désactivées si offline
  // §6.1 catégorie #8 S9 : Actions structurelles désactivées si execution-only
  const isActionBusy =
    addingStep ||
    addingReward ||
    swappingCards ||
    !!busyId ||
    resettingSession ||
    isOffline ||
    isExecutionOnly

  const displayedSlots = optimisticSlots ?? slots

  const swapCardsBetweenSlots = useCallback(
    async (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return

      const sourceSlot = displayedSlots.find(slot => slot.id === sourceId)
      const targetSlot = displayedSlots.find(slot => slot.id === targetId)
      if (!sourceSlot || !targetSlot) return

      // Source vide : aucune action (contrat UX explicite)
      if (!sourceSlot.card_id) return

      // Aucun changement effectif
      if (sourceSlot.card_id === targetSlot.card_id) return

      setActionError(null)
      setSwappingCards(true)

      const previousSlots = displayedSlots
      const swappedSlots = previousSlots.map(slot => {
        if (slot.id === sourceSlot.id) {
          return { ...slot, card_id: targetSlot.card_id }
        }
        if (slot.id === targetSlot.id) {
          return { ...slot, card_id: sourceSlot.card_id }
        }
        return slot
      })
      setOptimisticSlots(swappedSlots)

      const { error: targetUpdateError } = await onUpdateSlot(targetSlot.id, {
        card_id: sourceSlot.card_id,
      })

      if (targetUpdateError) {
        setOptimisticSlots(previousSlots)
        setSwappingCards(false)
        setActionError('Impossible de réorganiser la timeline. Réessaie.')
        return
      }

      const { error: sourceUpdateError } = await onUpdateSlot(sourceSlot.id, {
        card_id: targetSlot.card_id,
      })

      if (sourceUpdateError) {
        // Rollback DB best-effort pour revenir à l'état initial
        await onUpdateSlot(targetSlot.id, { card_id: targetSlot.card_id })
        setOptimisticSlots(previousSlots)
        setSwappingCards(false)
        setActionError('Impossible de réorganiser la timeline. Réessaie.')
        return
      }

      setSwappingCards(false)
      setOptimisticSlots(null)
    },
    [displayedSlots, onUpdateSlot]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragSlotId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDragSlotId(null)
      const overId = event.over?.id
      if (!overId) return
      await swapCardsBetweenSlots(String(event.active.id), String(overId))
    },
    [swapCardsBetweenSlots]
  )

  const openSequenceEditor = useCallback((slot: Slot) => {
    if (slot.kind !== 'step' || !slot.card_id) return
    setActiveSequenceSlot(slot)
  }, [])

  const closeSequenceEditor = useCallback(() => {
    setActiveSequenceSlot(null)
  }, [])

  // ── État chargement ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="slots-editor"
        aria-busy="true"
        aria-label="Chargement des slots"
      >
        <div className="slots-editor__loading">
          <span className="slots-editor__dot" aria-hidden="true" />
          <span className="slots-editor__dot" aria-hidden="true" />
          <span className="slots-editor__dot" aria-hidden="true" />
          <span className="sr-only">Chargement en cours</span>
        </div>
      </div>
    )
  }

  // ── Erreur de lecture ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="slots-editor">
        <p className="slots-editor__error" role="alert">
          Impossible de charger la timeline. Réessaie plus tard.
        </p>
      </div>
    )
  }

  const hasRewardSlot = displayedSlots.some(s => s.kind === 'reward')
  const stepSlotsCount = displayedSlots.filter(s => s.kind === 'step').length

  // ✅ Récompenses en premier, puis étapes (ordre position ASC dans chaque groupe)
  const sortedSlots = [
    ...displayedSlots.filter(s => s.kind === 'reward'),
    ...displayedSlots.filter(s => s.kind === 'step'),
  ]

  const resolvedActiveSequenceSlot = activeSequenceSlot
    ? (displayedSlots.find(slot => slot.id === activeSequenceSlot.id) ?? null)
    : null
  const activeSequence = resolvedActiveSequenceSlot?.card_id
    ? (sequences.find(
        sequence =>
          sequence.mother_card_id === resolvedActiveSequenceSlot.card_id
      ) ?? null)
    : null
  const activeMotherCard = resolvedActiveSequenceSlot?.card_id
    ? (bankCards.find(card => card.id === resolvedActiveSequenceSlot.card_id) ??
      personalCards.find(
        card => card.id === resolvedActiveSequenceSlot.card_id
      ) ??
      null)
    : null

  return (
    <div className="slots-editor">
      {swappingCards && (
        <div className="slots-editor__status-layer">
          <p className="slots-editor__status" role="status">
            Mise à jour de la timeline…
          </p>
        </div>
      )}

      {/* ── Liste des slots ──────────────────────────────────────────────────── */}
      {slots.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={event => {
            void handleDragEnd(event)
          }}
        >
          <ul className="slots-editor__list" aria-label="Slots de la timeline">
            {sortedSlots.map((slot, idx) => {
              // Séquence liée à la carte assignée (0..1 séquence par mother_card_id)
              const sequence = slot.card_id
                ? (sequences.find(s => s.mother_card_id === slot.card_id) ??
                  null)
                : null

              return (
                <SlotItem
                  key={slot.id}
                  slot={slot}
                  positionLabel={idx + 1}
                  onUpdate={onUpdateSlot}
                  onRemove={handleRemove}
                  bankCards={bankCards}
                  personalCards={personalCards}
                  busy={busyId === slot.id || swappingCards}
                  canRemove={slot.kind === 'step' && stepSlotsCount > 1}
                  sessionState={sessionState}
                  isValidated={validatedSlotIds?.has(slot.id) ?? false}
                  sequence={sequence}
                  onCreateSequence={createSequence}
                  onDeleteSequence={deleteSequence}
                  canCreateSequence={canCreateSequence}
                  onOpenSequenceEditor={openSequenceEditor}
                  isSequenceEditorOpen={activeSequenceSlot?.id === slot.id}
                  isOffline={isOffline}
                  isExecutionOnly={isExecutionOnly}
                  dndSlotId={slot.id}
                  isDragActive={activeDragSlotId === slot.id}
                  setSlotRef={node => setSlotRef(slot.id, node)}
                />
              )
            })}
          </ul>
        </DndContext>
      ) : (
        <p className="slots-editor__empty">Aucun slot dans cette timeline.</p>
      )}

      {/* ── Message d'erreur action ──────────────────────────────────────────── */}
      {actionError && (
        <p className="slots-editor__error" role="alert">
          {actionError}
        </p>
      )}

      {/* ── Boutons d'ajout ──────────────────────────────────────────────────── */}
      <div className="slots-editor__actions">
        <button
          type="button"
          className="slots-editor__btn slots-editor__btn--step"
          onClick={handleAddStep}
          disabled={isActionBusy}
          aria-busy={addingStep}
        >
          {addingStep ? 'Ajout…' : '+ Étape 🎯'}
        </button>

        {!hasRewardSlot && (
          <button
            type="button"
            className="slots-editor__btn slots-editor__btn--reward"
            onClick={handleAddReward}
            disabled={isActionBusy}
            aria-busy={addingReward}
          >
            {addingReward ? 'Ajout…' : '+ Récompense 🏆'}
          </button>
        )}
      </div>

      {/* ── Bouton "Réinitialiser la session" (runtime piloté en édition) ───── */}
      <div className="slots-editor__reset-session">
        <button
          type="button"
          className={`slots-editor__btn slots-editor__btn--reset${confirmReset ? ' slots-editor__btn--reset-confirm' : ''}`}
          onClick={handleResetSession}
          disabled={isActionBusy || !canResetSession}
          aria-busy={resettingSession}
          aria-label={
            confirmReset
              ? 'Confirmer la réinitialisation de la session'
              : canResetSession
                ? 'Réinitialiser la session (recommencer depuis le début)'
                : 'La réinitialisation devient disponible après le début de la progression'
          }
          title={
            canResetSession
              ? undefined
              : 'Disponible après le début de la progression'
          }
        >
          {resettingSession
            ? 'Réinitialisation…'
            : confirmReset
              ? 'Confirmer la réinitialisation ?'
              : 'Réinitialiser la session 🔄'}
        </button>
        {/* Annuler la confirmation */}
        {confirmReset && canResetSession && (
          <button
            type="button"
            className="slots-editor__btn slots-editor__btn--cancel"
            onClick={() => setConfirmReset(false)}
          >
            Annuler
          </button>
        )}
      </div>

      {resolvedActiveSequenceSlot?.card_id && (
        <Modal isOpen onClose={closeSequenceEditor} size="large">
          <SequenceEditor
            motherCardId={resolvedActiveSequenceSlot.card_id}
            motherCardLabel={activeMotherCard?.name ?? 'Carte'}
            sequence={activeSequence}
            bankCards={bankCards}
            personalCards={personalCards}
            onCreateSequence={createSequence}
            onDeleteSequence={deleteSequence}
            canCreateSequence={canCreateSequence}
            creationAvailabilityLoading={sequenceCreationAvailabilityLoading}
            isReadOnly={isSequenceReadOnly}
          />
        </Modal>
      )}
    </div>
  )
}

export default SlotsEditor
