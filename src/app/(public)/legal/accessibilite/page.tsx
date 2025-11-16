import Accessibilite from '@/page-components/legal/Accessibilite'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: 'Accessibilité - Appli-Picto',
  description: 'Déclaration d\'accessibilité WCAG 2.2 AA',
}

export default function AccessibilitePage() {
  return <Accessibilite />
}
