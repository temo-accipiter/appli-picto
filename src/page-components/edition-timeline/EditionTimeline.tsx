'use client'

/**
 * EditionTimeline — Page d'édition de la timeline du profil enfant actif.
 *
 * Architecture S4 + S6 :
 * - Badge/sélecteur de profil enfant actif en haut à droite (popover)
 * - Récupération automatique de la timeline (1:1 avec child_profile)
 * - Éditeur de slots (SlotsEditor) en dessous
 * - Verrouillage selon état de session (S6 — matrice §3.2.2bis)
 *
 * ⚠️ RÈGLES DB-FIRST
 * - Pas de logique quota côté client.
 * - Les triggers DB gèrent les invariants (min 1 step + 1 reward).
 * - Les refus DB sont traduits en messages UX neutres.
 * - "Réinitialiser la session" = reset progression via fonction DB dédiée.
 *
 * ⚠️ RÈGLES TSA
 * - showCreateButton=false : page focalisée sur la tâche (moins de charge cognitive).
 * - Chargement avec texte visible (pas d'écran vide).
 * - Sélection de profil = rechargement propre (reloadKey pattern).
 */

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useChildProfile } from '@/contexts/ChildProfileContext'
import { useOffline } from '@/contexts/OfflineContext'
import { useToast } from '@/contexts'
import useSessions from '@/hooks/useSessions'
import useSessionValidations from '@/hooks/useSessionValidations'
import useExecutionOnly from '@/hooks/useExecutionOnly'
import useSequencesWithVisitor from '@/hooks/useSequencesWithVisitor'
import { SlotsEditor } from '@/components/features/timeline'
import OfflineBanner from '@/components/shared/offline-banner/OfflineBanner'
import ExecutionOnlyBanner from '@/components/shared/execution-only-banner/ExecutionOnlyBanner'
import type { Timeline, Slot, SessionState } from '@/types/supabase'
import './EditionTimeline.scss'

interface EditionTimelineProps {
  embedded?: boolean
  timeline: Timeline | null
  slots: Slot[]
  slotsLoading: boolean
  slotsError: Error | null
  addStep: () => Promise<{ error: Error | null }>
  addReward: () => Promise<{ error: Error | null }>
  updateSlot: (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => Promise<{ error: Error | null }>
  removeSlot: (id: string) => Promise<{ error: Error | null }>
}

export default function EditionTimeline({
  embedded = false,
  timeline,
  slots,
  slotsLoading,
  slotsError,
  addStep,
  addReward,
  updateSlot,
  removeSlot,
}: EditionTimelineProps) {
  const {
    activeChildId,
    activeChildProfile,
    childProfiles,
    loading: childProfilesLoading,
    setActiveChildId,
  } = useChildProfile()
  const selectorRef = useRef<HTMLDivElement | null>(null)
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const syncViewport = () => setIsDesktop(mediaQuery.matches)

    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)
    return () => mediaQuery.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    if (!isProfilePopoverOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setIsProfilePopoverOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfilePopoverOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isProfilePopoverOpen])

  // ── SLOTS : Reçus en props depuis page.tsx (source unique partagée) ─────────
  // Plus de useSlots local → désync Timeline ↔ Bibliothèque résolu
  // Toutes les fonctions CRUD (addStep, updateSlot, etc.) proviennent du parent

  // ── S6 : Session active pour verrouillage et réinitialisation ──────────────
  // On charge la session uniquement si on a un profil + une timeline.
  // Cela permet d'afficher l'état de verrouillage à l'adulte en édition.
  const {
    session,
    resetSession,
    refresh: refreshSession,
  } = useSessions(activeChildId, timeline?.id ?? null)

  // Validations de la session (pour savoir quels slots sont verrouillés)
  const { validatedSlotIds, refresh: refreshValidations } =
    useSessionValidations(session?.id ?? null)

  // ── S7 : Séquences (refresh pour Bug A — séquence fantôme) ─────────────────
  // Rafraîchir séquences après updateSlot pour synchroniser avec les slots modifiés
  const { refresh: refreshSequences } = useSequencesWithVisitor()

  // ── Détection automatique de fin de session (Victory Check) ────────────────
  // Quand une session passe de 'active_started' à 'completed' suite à une
  // réduction de timeline (suppression de cartes non-validées), on informe
  // l'adulte et on rafraîchit les cadenas immédiatement.
  const prevSessionStateRef = useRef<SessionState | null>(null)

  useEffect(() => {
    const prevState = prevSessionStateRef.current
    const currentState = session?.state ?? null

    console.log('[EditionTimeline] Session state check:', {
      prev: prevState,
      current: currentState,
      transition:
        prevState === 'active_started' && currentState === 'completed',
    })

    if (prevState === 'active_started' && currentState === 'completed') {
      console.log(
        '[EditionTimeline] Victory Check détecté → Rafraîchissement cadenas + toast'
      )
      // Transition détectée : active_started → completed (Victory Check)
      // Rafraîchir les validations pour enlever les cadenas
      refreshValidations()
      // Toast informatif (adulte en édition)
      showToast(
        'Session terminée automatiquement — toutes les cartes restantes étaient validées',
        'info'
      )
    }

    prevSessionStateRef.current = currentState
  }, [session?.state, refreshValidations, showToast])

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

  const safeUpdateSlot = async (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => {
    if (guardStructural()) return { error: null }

    const result = await updateSlot(id, updates)

    // 🆕 CORRECTIF BUG A (Séquence fantôme) : Rafraîchir séquences si carte assignée/retirée
    // Rationale : updateSlot() rafraîchit uniquement les slots, pas les séquences.
    // Si une carte avec séquence est assignée, le tableau sequences[] doit être resync.
    if (!result.error && updates.card_id !== undefined) {
      refreshSequences()
    }

    return result
  }

  const safeRemoveSlot = async (id: string) => {
    if (guardStructural()) return { error: null }

    const result = await removeSlot(id)

    if (!result.error) {
      // Rafraîchir la session immédiatement après suppression
      // pour détecter si le Victory Check a complété la session
      refreshSession()
    }

    return result
  }

  const safeResetSession = async () => {
    if (guardStructural()) return { error: null }

    const result = await resetSession()

    if (!result.error) {
      // Rafraîchir les validations pour mettre à jour les cadenas immédiatement
      refreshValidations()
      // Toast de confirmation
      showToast('Session réinitialisée avec succès', 'success')
    }

    return result
  }
  const canResetSession = session?.state === 'active_started'

  const RootTag: 'main' | 'section' = embedded ? 'section' : 'main'
  const activeInitial = activeChildProfile?.name?.charAt(0).toUpperCase() || '?'

  const handleProfileTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsProfilePopoverOpen(prev => !prev)
    }
    if (event.key === 'Escape') {
      setIsProfilePopoverOpen(false)
    }
  }

  return (
    <RootTag className="edition-timeline" aria-label="Édition de la timeline">
      <div className="edition-timeline__top-bar">
        <p className="edition-timeline__subtitle">
          Glisse l&apos;image d&apos;un slot sur un autre pour échanger. Glisse
          sur Récompense pour la remplir.
        </p>
        {childProfilesLoading || childProfiles.length === 0 ? (
          <div className="edition-timeline__profile-placeholder">
            <span className="avatar-circle" aria-hidden="true">
              ?
            </span>
            <span className="sr-only">Aucun profil enfant</span>
          </div>
        ) : (
          <div
            className="edition-timeline__profile-selector"
            ref={selectorRef}
            onMouseEnter={() => {
              if (isDesktop) setIsProfilePopoverOpen(true)
            }}
            onMouseLeave={() => {
              if (isDesktop) setIsProfilePopoverOpen(false)
            }}
          >
            <button
              type="button"
              className="edition-timeline__profile-trigger"
              aria-haspopup="menu"
              aria-expanded={isProfilePopoverOpen}
              aria-label={
                activeChildProfile
                  ? `Profil enfant actif : ${activeChildProfile.name}`
                  : 'Aucun profil enfant'
              }
              onClick={() => setIsProfilePopoverOpen(prev => !prev)}
              onFocus={() => setIsProfilePopoverOpen(true)}
              onKeyDown={handleProfileTriggerKeyDown}
            >
              <span className="avatar-circle" aria-hidden="true">
                {activeInitial}
              </span>
            </button>

            {isProfilePopoverOpen && (
              <div
                className="edition-timeline__profile-popover"
                role="menu"
                aria-label="Sélectionner un profil enfant"
              >
                {childProfiles.map(profile => {
                  const isActive = profile.id === activeChildId
                  const isLocked = profile.status === 'locked'
                  const initial = profile.name.charAt(0).toUpperCase()

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      aria-label={
                        isLocked
                          ? `${profile.name} — verrouillé (lecture seule)`
                          : `Sélectionner ${profile.name}`
                      }
                      className={`edition-timeline__profile-item ${
                        isActive ? 'edition-timeline__profile-item--active' : ''
                      }`}
                      disabled={isLocked}
                      onClick={() => {
                        if (isLocked) return
                        setActiveChildId(profile.id)
                        setIsProfilePopoverOpen(false)
                      }}
                    >
                      <span className="avatar-circle" aria-hidden="true">
                        {initial}
                      </span>
                      <span className="sr-only">{profile.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

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

      {!timeline && (
        <p className="edition-timeline__no-timeline" role="status">
          {childProfilesLoading
            ? 'Chargement du profil enfant...'
            : childProfiles.length === 0
              ? 'Aucun profil enfant disponible.'
              : 'Chargement de la timeline...'}
        </p>
      )}

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
          sessionState={session?.state ?? null}
          validatedSlotIds={validatedSlotIds}
          onResetSession={safeResetSession}
          canResetSession={canResetSession}
          isOffline={!isOnline}
          isExecutionOnly={isExecutionOnly}
        />
      )}
    </RootTag>
  )
}
