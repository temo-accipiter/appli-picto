'use client'

import Edition from '@/page-components/edition/Edition'
import EditionTimeline from '@/page-components/edition-timeline/EditionTimeline'
import { useChildProfile } from '@/contexts/ChildProfileContext'
import { useTimelines, useSlots } from '@/hooks'

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
  const {
    slots,
    loading: slotsLoading,
    error: slotsError,
    addStep,
    addReward,
    updateSlot,
    removeSlot,
    refresh: refreshSlots,
  } = useSlots(timeline?.id ?? null)

  return (
    <>
      <EditionTimeline
        embedded
        timeline={timeline}
        slots={slots}
        slotsLoading={slotsLoading}
        slotsError={slotsError}
        addStep={addStep}
        addReward={addReward}
        updateSlot={updateSlot}
        removeSlot={removeSlot}
      />
      <Edition
        timeline={timeline}
        slots={slots}
        updateSlot={updateSlot}
        refreshSlots={refreshSlots}
      />
    </>
  )
}
