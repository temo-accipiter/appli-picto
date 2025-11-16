import CGV from '@/page-components/legal/CGV'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: 'Conditions Générales de Vente - Appli-Picto',
  description: 'Conditions générales de vente et tarifs Appli-Picto',
}

export default function CGVPage() {
  return <CGV />
}
