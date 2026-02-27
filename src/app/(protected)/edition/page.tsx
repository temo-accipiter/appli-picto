import Edition from '@/page-components/edition/Edition'
import EditionTimeline from '@/page-components/edition-timeline/EditionTimeline'

// Force dynamic rendering (hooks client, auth, contexte)
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Édition - Appli-Picto',
  description: 'Gestion de la timeline et création de cartes personnelles',
}

export default function EditionPage() {
  return (
    <>
      <EditionTimeline embedded />
      <Edition />
    </>
  )
}
