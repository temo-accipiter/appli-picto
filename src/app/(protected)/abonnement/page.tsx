import Abonnement from '@/page-components/abonnement/Abonnement'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: 'Abonnement - Appli-Picto',
  description: 'Gérez votre abonnement et accédez aux fonctionnalités premium',
}

export default function AbonnementPage() {
  return <Abonnement />
}
