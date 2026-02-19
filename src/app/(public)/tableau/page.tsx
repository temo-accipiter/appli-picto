// S5 — Contexte Tableau : sessions + validations + progression
// Remplace le STABILIZATION PATCH (MigrationPlaceholder) par le Tableau réel.
// DB-first strict : création session automatique, validations idempotentes,
// progression via snapshot (jamais de recomptage live).

import Tableau from '@/page-components/tableau/Tableau'

// Force dynamic rendering (hooks client, auth, contexte enfant)
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tableau - Appli-Picto',
  description: 'Activités de la journée',
}

export default function TableauPage() {
  return <Tableau />
}
