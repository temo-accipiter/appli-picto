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
import { ChildProfileSelector } from '@/components/features/child-profile'
import { SlotsEditor } from '@/components/features/timeline'
import OfflineBanner from '@/components/shared/offline-banner/OfflineBanner'
import './EditionTimeline.scss'

export default function EditionTimeline() {
  const {
    activeChildId,
    activeChildProfile,
    loading: profilesLoading,
  } = useChildProfile()

  // ── S8 : Offline guard (§4.4) ───────────────────────────────────────────────
  // isOnline : détermine si les actions structurelles sont autorisées
  // pendingCount : nombre de validations en attente de sync (pour le bandeau)
  //
  // ⚠️ Le bandeau offline EST affiché en Contexte Édition (§4.4.1)
  // ⚠️ Il N'EST PAS affiché en Contexte Tableau (§6.2 — invariant TSA)
  const { isOnline, pendingCount } = useOffline()
  const { showToast } = useToast()

  // Clé de rechargement : change quand l'enfant actif change
  // Permet de forcer un reset propre de l'état local (TSA anti-choc)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setReloadKey(k => k + 1)
  }, [activeChildId])

  // Lecture de la timeline pour l'enfant actif (1:1)
  const {
    timeline,
    loading: timelineLoading,
    error: timelineError,
  } = useTimelines(activeChildId)

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

  const isLoading = profilesLoading || timelineLoading

  // ── S8 : Wrappers offline pour les handlers de SlotsEditor ─────────────────
  // §4.4 : CRUD structure interdit offline → guard UX (toast + désactivation)
  //
  // Ces fonctions sont définies APRÈS tous les hooks (useSessions etc.) pour
  // pouvoir referencer addStep, resetSession, etc. en closure.

  /** Guard offline : informe l'adulte et bloque l'action */
  const guardOffline = (): boolean => {
    if (!isOnline) {
      showToast('Indisponible hors connexion', 'warning')
      return true
    }
    return false
  }

  const safeAddStep = async () => {
    if (guardOffline()) return { error: null }
    return addStep()
  }

  const safeAddReward = async () => {
    if (guardOffline()) return { error: null }
    return addReward()
  }

  const safeClearAllCards = async () => {
    if (guardOffline()) return { error: null }
    return clearAllCards()
  }

  const safeUpdateSlot = async (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => {
    if (guardOffline()) return { error: null }
    return updateSlot(id, updates)
  }

  const safeRemoveSlot = async (id: string) => {
    if (guardOffline()) return { error: null }
    return removeSlot(id)
  }

  const safeResetSession = session
    ? async () => {
        if (guardOffline()) return { error: null }
        return resetSession()
      }
    : undefined

  return (
    <main className="edition-timeline" aria-label="Édition de la timeline">
      {/* ── S8 : Bandeau offline (§4.4.1) ──────────────────────────────────────
           Affiché uniquement quand le navigateur est hors connexion.
           Non modal, non bloquant, discret pour l'adulte.
           ⚠️ Jamais affiché en Contexte Tableau (§6.2) — uniquement ici.
      ── */}
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* ── En-tête ────────────────────────────────────────────────────────────── */}
      <header className="edition-timeline__header">
        <h1 className="edition-timeline__title">Édition de la timeline</h1>
        <p className="edition-timeline__subtitle">
          Sélectionne un profil enfant pour modifier sa timeline.
        </p>
      </header>

      {/* ── Sélecteur de profil ─────────────────────────────────────────────────
           showCreateButton=false : la page Édition reste focalisée sur la tâche.
           Pour créer un profil → /profil. Moins d'options = moins de charge cognitive TSA.
      ── */}
      <section
        className="edition-timeline__profiles"
        aria-label="Choisir un profil enfant"
      >
        <ChildProfileSelector showCreateButton={false} />
      </section>

      {/* ── Contenu principal ───────────────────────────────────────────────────── */}
      <section className="edition-timeline__content" aria-live="polite">
        {/* Chargement global — texte visible, pas d'écran vide */}
        {isLoading && (
          <div className="edition-timeline__loading" aria-busy="true">
            <span aria-hidden="true">⏳</span>
            <span>Chargement…</span>
          </div>
        )}

        {/* Aucun profil sélectionné */}
        {!isLoading && !activeChildId && (
          <div className="edition-timeline__empty">
            <span
              className="edition-timeline__empty-icon"
              aria-hidden="true"
              role="img"
            >
              👆
            </span>
            <p>Sélectionne un profil ci-dessus pour commencer.</p>
          </div>
        )}

        {/* Profil actif → titre + éditeur */}
        {!isLoading && activeChildId && (
          <>
            {activeChildProfile && (
              <h2 className="edition-timeline__child-name">
                Timeline de {activeChildProfile.name}
              </h2>
            )}

            {/* Erreur de chargement timeline — message neutre */}
            {!timelineLoading && timelineError && (
              <p className="edition-timeline__error" role="alert">
                Impossible de charger la timeline. Réessaie plus tard.
              </p>
            )}

            {/* Timeline pas encore créée — uniquement si pas d'erreur */}
            {!timelineLoading && !timelineError && !timeline && (
              <p className="edition-timeline__no-timeline">
                La timeline est en cours d&apos;initialisation…
              </p>
            )}

            {/* Éditeur de slots — S6 : verrouillage session · S8 : guard offline */}
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
              />
            )}
          </>
        )}
      </section>
    </main>
  )
}
