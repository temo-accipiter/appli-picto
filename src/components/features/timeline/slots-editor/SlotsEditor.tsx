'use client'

/**
 * SlotsEditor — Éditeur de la liste des slots d'une timeline.
 *
 * Affiche :
 * - La liste ordonnée des slots (étapes + récompenses)
 * - Des boutons pour ajouter une étape ou une récompense
 * - Un bouton "Retirer toutes les cartes" avec confirmation 1-clic
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
 * - "Retirer toutes les cartes" = UPDATE card_id=NULL (pas DELETE)
 *   Les triggers DB interdisent la suppression du dernier step/reward.
 * - "Réinitialiser la session" = DELETE + INSERT (epoch++ géré par trigger DB)
 * - Les cartes banque/perso sont chargées ici (une seule requête) et transmises
 *   à chaque SlotItem (évite N requêtes parallèles).
 *
 * ⚠️ MATRICE DE VERROUILLAGE S6 (§3.2.2bis)
 * - sessionState + validatedSlotIds transmis à chaque SlotItem.
 * - Le verrouillage est appliqué dans SlotItem, pas ici.
 */

import { useEffect, useRef, useState } from 'react'
import type { Slot } from '@/hooks/useSlots'
import type { SessionState } from '@/hooks/useSessions'
import useBankCards from '@/hooks/useBankCards'
import usePersonalCards from '@/hooks/usePersonalCards'
import useSequences from '@/hooks/useSequences'
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
  /** Retirer toutes les cartes (UPDATE card_id=NULL sur tous les slots) */
  onClearAllCards: () => Promise<{ error: Error | null }>
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
   * Réinitialiser la session (DELETE + INSERT, epoch++ côté DB).
   * Réservé à l'adulte. Si undefined → bouton masqué.
   */
  onResetSession?: () => Promise<{ error: Error | null }>
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
  onClearAllCards,
  sessionState = null,
  validatedSlotIds,
  onResetSession,
  isOffline = false,
  isExecutionOnly = false,
}: SlotsEditorProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [addingStep, setAddingStep] = useState(false)
  const [addingReward, setAddingReward] = useState(false)
  const [clearingCards, setClearingCards] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [resettingSession, setResettingSession] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Chargement des cartes une seule fois, transmises à chaque SlotItem
  const { cards: bankCards, refresh: refreshBankCards } = useBankCards()
  const { cards: personalCards, refresh: refreshPersonalCards } =
    usePersonalCards()
  const lastMissingSignatureRef = useRef('')

  // Chargement des séquences du compte (S7 — pour les étapes avec carte assignée)
  const { sequences, createSequence, deleteSequence } = useSequences()

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
  }, [
    slots,
    bankCards,
    personalCards,
    refreshBankCards,
    refreshPersonalCards,
  ])

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
    if (msg.includes('timeline') || msg.includes('pas de timeline')) {
      return 'Aucun profil enfant sélectionné. Sélectionne un profil dans la barre de navigation.'
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
    setBusyId(id)
    setActionError(null)
    const { error: err } = await onRemoveSlot(id)
    setBusyId(null)
    if (err) setActionError(dbErrorToMessage(err))
  }

  const handleClearAllCards = async () => {
    // Premier clic → demande confirmation
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    // Deuxième clic → exécute
    setConfirmClear(false)
    setClearingCards(true)
    setActionError(null)
    const { error: err } = await onClearAllCards()
    setClearingCards(false)
    if (err) setActionError('Impossible de retirer les cartes. Réessaie.')
  }

  const handleResetSession = async () => {
    if (!onResetSession) return
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
    !!busyId ||
    clearingCards ||
    resettingSession ||
    isOffline ||
    isExecutionOnly

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

  // Afficher le bouton "Retirer les cartes" uniquement si au moins un slot a une carte
  const hasSomeCard = slots.some(s => s.card_id !== null)

  // ✅ Récompenses en premier, puis étapes (ordre position ASC dans chaque groupe)
  const sortedSlots = [
    ...slots.filter(s => s.kind === 'reward'),
    ...slots.filter(s => s.kind === 'step'),
  ]

  return (
    <div className="slots-editor">
      {/* ── Liste des slots ──────────────────────────────────────────────────── */}
      {slots.length > 0 ? (
        <ul className="slots-editor__list" aria-label="Slots de la timeline">
          {sortedSlots.map((slot, idx) => {
            // Séquence liée à la carte assignée (0..1 séquence par mother_card_id)
            const sequence = slot.card_id
              ? (sequences.find(s => s.mother_card_id === slot.card_id) ?? null)
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
                busy={busyId === slot.id}
                sessionState={sessionState}
                isValidated={validatedSlotIds?.has(slot.id) ?? false}
                sequence={sequence}
                onCreateSequence={createSequence}
                onDeleteSequence={deleteSequence}
                isOffline={isOffline}
                isExecutionOnly={isExecutionOnly}
              />
            )
          })}
        </ul>
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

        <button
          type="button"
          className="slots-editor__btn slots-editor__btn--reward"
          onClick={handleAddReward}
          disabled={isActionBusy}
          aria-busy={addingReward}
        >
          {addingReward ? 'Ajout…' : '+ Récompense 🏆'}
        </button>
      </div>

      {/* ── Bouton "Retirer toutes les cartes" ──────────────────────────────── */}
      {hasSomeCard && (
        <div className="slots-editor__clear">
          <button
            type="button"
            className={`slots-editor__btn slots-editor__btn--clear${confirmClear ? ' slots-editor__btn--clear-confirm' : ''}`}
            onClick={handleClearAllCards}
            disabled={isActionBusy}
            aria-busy={clearingCards}
          >
            {clearingCards
              ? 'Retrait en cours…'
              : confirmClear
                ? 'Confirmer le retrait de toutes les cartes ?'
                : 'Retirer toutes les cartes'}
          </button>
          {/* Annuler la confirmation */}
          {confirmClear && (
            <button
              type="button"
              className="slots-editor__btn slots-editor__btn--cancel"
              onClick={() => setConfirmClear(false)}
            >
              Annuler
            </button>
          )}
        </div>
      )}

      {/* ── Bouton "Réinitialiser la session" (S6 — adulte uniquement) ──────── */}
      {/* Affiché uniquement si onResetSession est fourni (session existante) */}
      {onResetSession && (
        <div className="slots-editor__reset-session">
          <button
            type="button"
            className={`slots-editor__btn slots-editor__btn--reset${confirmReset ? ' slots-editor__btn--reset-confirm' : ''}`}
            onClick={handleResetSession}
            disabled={isActionBusy}
            aria-busy={resettingSession}
            aria-label={
              confirmReset
                ? 'Confirmer la réinitialisation de la session'
                : 'Réinitialiser la session (recommencer depuis le début)'
            }
          >
            {resettingSession
              ? 'Réinitialisation…'
              : confirmReset
                ? 'Confirmer la réinitialisation ?'
                : 'Réinitialiser la session 🔄'}
          </button>
          {/* Annuler la confirmation */}
          {confirmReset && (
            <button
              type="button"
              className="slots-editor__btn slots-editor__btn--cancel"
              onClick={() => setConfirmReset(false)}
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default SlotsEditor
