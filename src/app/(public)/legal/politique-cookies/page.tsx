import PolitiqueCookies from '@/page-components/legal/PolitiqueCookies'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Politique des Cookies - Appli-Picto',
  description: 'Gestion et utilisation des cookies sur Appli-Picto',
}

export default function PolitiqueCookiesPage() {
  return <PolitiqueCookies />
}
