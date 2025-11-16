import Tableau from '@/page-components/tableau/Tableau'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: 'Tableau - Appli-Picto',
  description: 'Tableau de tâches et récompenses pour enfants TSA',
}

export default function TableauPage() {
  return <Tableau />
}
