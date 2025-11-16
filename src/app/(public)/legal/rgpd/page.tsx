import PortailRGPD from '@/page-components/legal/rgpd/PortailRGPD'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: 'RGPD - Appli-Picto',
  description: 'Portail RGPD et gestion de vos données personnelles',
}

export default function RGPDPage() {
  return <PortailRGPD />
}
