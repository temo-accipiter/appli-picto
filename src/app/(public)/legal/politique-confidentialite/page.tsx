import PolitiqueConfidentialite from '@/page-components/legal/PolitiqueConfidentialite'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: 'Politique de Confidentialité - Appli-Picto',
  description: 'Politique de confidentialité et protection des données personnelles',
}

export default function PolitiqueConfidentialitePage() {
  return <PolitiqueConfidentialite />
}
