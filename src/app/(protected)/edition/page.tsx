'use client'

import Edition from '@/page-components/edition/Edition'
import EditionTimeline from '@/page-components/edition-timeline/EditionTimeline'
import { useChildProfile } from '@/contexts/ChildProfileContext'
import {
  useTimelines,
  useSlots,
  useSessions,
  useAccountStatus,
  useBankCards,
  useAdminBankCards,
} from '@/hooks'

// Note: metadata déplacé car page devient Client Component
// SEO géré par layout parent

export default function EditionPage() {
  const { activeChildId } = useChildProfile()

  // ── SOURCE UNIQUE : Timeline + Slots au niveau page ──────────────────────────
  // Solution bug désync Timeline ↔ Bibliothèque:
  // - EditionTimeline et Edition partageaient chacun une instance useSlots séparée
  // - Quand Edition updateSlot via checkbox, EditionTimeline ne savait rien
  // - Lift state ici = les deux composants voient les mêmes slots
  const { timeline } = useTimelines(activeChildId)

  // Session chargée ici — SOURCE UNIQUE pour toute la page.
  // Évite le bug de désynchronisation post-reset :
  // resetSession() appelle refresh() sur cette instance → session.state passe à
  // 'active_preview' → tous les consommateurs (EditionTimeline, Edition, useSlots)
  // se déverrouillent immédiatement via la propagation de props.
  const {
    session,
    resetSession,
    refresh: refreshSession,
  } = useSessions(activeChildId, timeline?.id ?? null)

  const {
    slots,
    loading: slotsLoading,
    error: slotsError,
    addStep,
    updateSlot,
    removeSlot,
    refresh: refreshSlots,
  } = useSlots(timeline?.id ?? null, session?.state)

  // ── SOURCE UNIQUE : Cartes banque au niveau page ─────────────────────────────
  // Solution bug refresh nom carte : Edition et SlotsEditor partagent les mêmes cartes
  // - Admin : useAdminBankCards (toutes cartes)
  // - Autres : useBankCards (cartes publiées uniquement)
  const { isAdmin } = useAccountStatus()
  const adminBankCardsHook = useAdminBankCards()
  const publicBankCardsHook = useBankCards()

  const { cards: bankCards, refresh: refreshBankCards } = isAdmin
    ? adminBankCardsHook
    : publicBankCardsHook

  return (
    <>
      <EditionTimeline
        embedded
        timeline={timeline}
        slots={slots}
        slotsLoading={slotsLoading}
        slotsError={slotsError}
        addStep={addStep}
        updateSlot={updateSlot}
        removeSlot={removeSlot}
        bankCards={bankCards}
        session={session}
        resetSession={resetSession}
        refreshSession={refreshSession}
      />
      <Edition
        timeline={timeline}
        slots={slots}
        updateSlot={updateSlot}
        refreshSlots={refreshSlots}
        bankCards={bankCards}
        refreshBankCards={refreshBankCards}
        session={session}
      />
    </>
  )
}
