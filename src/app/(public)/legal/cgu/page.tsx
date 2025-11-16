import CGU from '@/page-components/legal/CGU'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: "Conditions Générales d'Utilisation - Appli-Picto",
  description: "Conditions générales d'utilisation du service Appli-Picto",
}

export default function CGUPage() {
  return <CGU />
}
