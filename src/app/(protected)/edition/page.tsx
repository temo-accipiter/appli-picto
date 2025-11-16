import Edition from '@/page-components/edition/Edition'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: 'Édition - Appli-Picto',
  description: 'Créez et modifiez vos tâches et récompenses',
}

export default function EditionPage() {
  return <Edition />
}
