import Profil from '@/page-components/profil/Profil'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: 'Profil - Appli-Picto',
  description: 'Gérez votre profil utilisateur',
}

export default function ProfilPage() {
  return <Profil />
}
