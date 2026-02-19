// S4 — Éditeur de timelines et slots
// Remplace le STABILIZATION PATCH (MigrationPlaceholder) par l'éditeur réel.
// DB-first strict : triggers DB garantissent les invariants (min 1 step + 1 reward).
//
// ⚠️ NOTE : L'ancien Edition.tsx (tâches, récompenses, catégories) sera réintégré
// une fois ses hooks migrés vers le nouveau schéma DB (slice future).

import EditionTimeline from '@/page-components/edition-timeline/EditionTimeline'

// Force dynamic rendering (hooks client, auth, contexte)
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Édition - Appli-Picto',
  description: 'Modifiez la timeline de votre enfant',
}

export default function EditionPage() {
  return <EditionTimeline />
}
