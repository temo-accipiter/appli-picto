'use client'

import Loader from '@/components/ui/loader/Loader'
import { useAccountStatus } from '@/hooks'
import Link from 'next/link'
import type { ReactNode } from 'react'

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h1
          style={{ fontSize: '4rem', marginBottom: '1rem', color: '#5A9FB8' }}
        >
          404
        </h1>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>
          Page non trouvée
        </h2>
        <p style={{ fontSize: '1rem', color: '#999', marginBottom: '2rem' }}>
          La page que vous recherchez n&apos;existe pas.
        </p>
        <Link
          href="/"
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#5A9FB8',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem',
          }}
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    )
  }

  return children
}
