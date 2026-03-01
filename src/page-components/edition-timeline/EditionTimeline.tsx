'use client'

/**
 * EditionTimeline — Page d'édition de la timeline du profil enfant actif.
 *
 * Architecture S4 + S6 :
 * - Sélecteur de profil enfant en haut (ChildProfileSelector)
 * - Récupération automatique de la timeline (1:1 avec child_profile)
 * - Éditeur de slots (SlotsEditor) en dessous
 * - Verrouillage selon état de session (S6 — matrice §3.2.2bis)
 *
 * ⚠️ RÈGLES DB-FIRST
 * - Pas de logique quota côté client.
 * - Les triggers DB gèrent les invariants (min 1 step + 1 reward).
 * - Les refus DB sont traduits en messages UX neutres.
 * - "Réinitialiser la session" = DELETE + INSERT (epoch++ via trigger DB).
 *
 * ⚠️ RÈGLES TSA
 * - showCreateButton=false : page focalisée sur la tâche (moins de charge cognitive).
 * - Chargement avec texte visible (pas d'écran vide).
 * - Sélection de profil = rechargement propre (reloadKey pattern).
 */

import { useEffect, useState } from 'react'
import { useChildProfile } from '@/contexts/ChildProfileContext'
import { useOffline } from '@/contexts/OfflineContext'
import { useToast } from '@/contexts'
import useTimelines from '@/hooks/useTimelines'
import useSlots from '@/hooks/useSlots'
import useSessions from '@/hooks/useSessions'
import useSessionValidations from '@/hooks/useSessionValidations'
import useExecutionOnly from '@/hooks/useExecutionOnly'
import { SlotsEditor } from '@/components/features/timeline'
import OfflineBanner from '@/components/shared/offline-banner/OfflineBanner'
import ExecutionOnlyBanner from '@/components/shared/execution-only-banner/ExecutionOnlyBanner'
import './EditionTimeline.scss'

interface EditionTimelineProps {
  embedded?: boolean
}

export default function EditionTimeline({
  embedded = false,
}: EditionTimelineProps) {
  const { activeChildId } = useChildProfile()

  // ── S8 : Offline guard (§4.4) ───────────────────────────────────────────────
  // isOnline : détermine si les actions structurelles sont autorisées
  // pendingCount : nombre de validations en attente de sync (pour le bandeau)
  //
  // ⚠️ Le bandeau offline EST affiché en Contexte Édition (§4.4.1)
  // ⚠️ Il N'EST PAS affiché en Contexte Tableau (§6.2 — invariant TSA)
  const { isOnline, pendingCount } = useOffline()
  const { showToast } = useToast()

  // ── S9 : Execution-only guard (§9 — Downgrade) ──────────────────────────────
  // isExecutionOnly : true si le compte est en mode exécution-uniquement après downgrade.
  // CRUD structure désactivé (RLS BLOCKER 4), exécution (sessions, validations) autorisée.
  //
  // ⚠️ Usage COSMÉTIQUE : la DB refuse les écritures structurelles via RLS.
  // ⚠️ Le bandeau execution-only EST affiché en Contexte Édition uniquement.
  // ⚠️ Il N'EST PAS affiché en Contexte Tableau (§6.2 — invariant TSA).
  const { isExecutionOnly } = useExecutionOnly()

  // Clé de rechargement : change quand l'enfant actif change
  // Permet de forcer un reset propre de l'état local (TSA anti-choc)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setReloadKey(k => k + 1)
  }, [activeChildId])

  // Lecture de la timeline pour l'enfant actif (1:1)
  const { timeline } = useTimelines(activeChildId)

  // CRUD slots de la timeline
  const {
    slots,
    loading: slotsLoading,
    error: slotsError,
    addStep,
    addReward,
    updateSlot,
    removeSlot,
    clearAllCards,
  } = useSlots(timeline?.id ?? null)

  // ── S6 : Session active pour verrouillage et réinitialisation ──────────────
  // On charge la session uniquement si on a un profil + une timeline.
  // Cela permet d'afficher l'état de verrouillage à l'adulte en édition.
  const { session, resetSession } = useSessions(
    activeChildId,
    timeline?.id ?? null
  )

  // Validations de la session (pour savoir quels slots sont verrouillés)
  const { validatedSlotIds } = useSessionValidations(session?.id ?? null)

  // ── S8 : Wrappers offline pour les handlers de SlotsEditor ─────────────────
  // §4.4 : CRUD structure interdit offline → guard UX (toast + désactivation)
  //
  // Ces fonctions sont définies APRÈS tous les hooks (useSessions etc.) pour
  // pouvoir referencer addStep, resetSession, etc. en closure.

  /**
   * Guard structure : informe l'adulte et bloque l'action si offline ou execution-only.
   * Retourne true si l'action doit être bloquée.
   */
  const guardStructural = (): boolean => {
    if (!isOnline) {
      showToast('Indisponible hors connexion', 'warning')
      return true
    }
    if (isExecutionOnly) {
      showToast(
        "Mode exécution uniquement — l'édition de structure est désactivée",
        'warning'
      )
      return true
    }
    return false
  }

  const safeAddStep = async () => {
    if (guardStructural()) return { error: null }
    return addStep()
  }

  const safeAddReward = async () => {
    if (guardStructural()) return { error: null }
    return addReward()
  }

  const safeClearAllCards = async () => {
    if (guardStructural()) return { error: null }
    return clearAllCards()
  }

  const safeUpdateSlot = async (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => {
    if (guardStructural()) return { error: null }
    return updateSlot(id, updates)
  }

  const safeRemoveSlot = async (id: string) => {
    if (guardStructural()) return { error: null }
    return removeSlot(id)
  }

  const safeResetSession = session
    ? async () => {
        if (guardStructural()) return { error: null }
        return resetSession()
      }
    : undefined

  const RootTag: 'main' | 'section' = embedded ? 'section' : 'main'

  return (
    <RootTag className="edition-timeline" aria-label="Édition de la timeline">
      {/* ── S8 : Bandeau offline (§4.4.1) ──────────────────────────────────────
           Affiché uniquement quand le navigateur est hors connexion.
           Non modal, non bloquant, discret pour l'adulte.
           ⚠️ Jamais affiché en Contexte Tableau (§6.2) — uniquement ici.
      ── */}
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* ── S9 : Bandeau execution-only (§9 — Downgrade) ────────────────────────
           Affiché quand le compte est en mode exécution-uniquement (après downgrade).
           Non modal, non bloquant. Propose un lien vers la page abonnement.
           ⚠️ Jamais affiché en Contexte Tableau (§6.2) — uniquement ici.
           ⚠️ L'exécution (sessions, validations) reste autorisée même en execution-only.
      ── */}
      {isExecutionOnly && <ExecutionOnlyBanner />}

      {/* ── Éditeur de slots — rendu uniquement si la timeline est chargée ──────
           ⚠️ GUARD CRITIQUE : sans timeline, SlotsEditor ne peut pas créer de slots
           (addSlot vérifie timelineId dans useSlots et retourne une erreur si null).
           Ce guard empêche l'utilisateur de cliquer pendant le chargement asynchrone.
      ── */}
      {timeline && (
        <SlotsEditor
          key={`${timeline.id}-${reloadKey}`}
          slots={slots}
          loading={slotsLoading}
          error={slotsError}
          onAddStep={safeAddStep}
          onAddReward={safeAddReward}
          onUpdateSlot={safeUpdateSlot}
          onRemoveSlot={safeRemoveSlot}
          onClearAllCards={safeClearAllCards}
          sessionState={session?.state ?? null}
          validatedSlotIds={validatedSlotIds}
          onResetSession={safeResetSession}
          isOffline={!isOnline}
          isExecutionOnly={isExecutionOnly}
        />
      )}
    </RootTag>
  )
}
