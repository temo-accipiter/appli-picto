'use client'

import Loader from '@/components/ui/loader/Loader'
import { useAccountStatus } from '@/hooks'
import Link from 'next/link'
import type { ReactNode } from 'react'
import './AdminRoute.scss'

interface AdminRouteProps {
  children: ReactNode
}

/**
 * Composant de protection des routes admin (DB-first strict).
 *
 * - Pendant le chargement : loader neutre accessible (pas d'écran vide).
 * - Non-admin : UI neutre identique à la page 404 globale (pas de hint, pas de redirect).
 * - Admin confirmé (accounts.status = 'admin') : rendu du contenu.
 *
 * Règles :
 * - JAMAIS de redirect (router.replace, redirect())
 * - JAMAIS de mot "admin", "forbidden", "permission" visible
 * - JAMAIS de notFound() côté client (comportement non déterministe selon hydration)
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, loading } = useAccountStatus()

  if (loading) {
    return <Loader />
  }

  if (!isAdmin) {
    return (
      <div className="admin-404">
        <span className="admin-404__code" aria-hidden>
          404
        </span>
        <h1 className="admin-404__title">Page non trouvée</h1>
        <p className="admin-404__desc">
          La page que vous recherchez n&apos;existe pas.
        </p>
        <Link href="/" className="admin-404__link">
          Retour à l&apos;accueil
        </Link>
      </div>
    )
  }

  return children
}
