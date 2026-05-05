import Link from 'next/link'
import { Footer } from '@/components'
import './not-found.scss'

// Force dynamic rendering (no prerendering) due to client-only dependencies in global providers
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <>
      <div className="not-found">
        <h1 className="not-found__code">404</h1>
        <h2 className="not-found__title">Page non trouvée</h2>
        <p className="not-found__subtitle">
          La page que vous recherchez n&apos;existe pas.
        </p>
        <Link href="/" className="not-found__action">
          Retour à l&apos;accueil
        </Link>
      </div>
      <Footer />
    </>
  )
}
