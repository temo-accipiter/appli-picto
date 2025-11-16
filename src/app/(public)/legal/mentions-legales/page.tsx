import MentionsLegales from '@/page-components/legal/MentionsLegales'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mentions légales - Appli-Picto',
  description: 'Mentions légales et informations juridiques',
}

export default function MentionsLegalesPage() {
  return <MentionsLegales />
}
