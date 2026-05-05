'use client'

import type { ReactNode } from 'react'
import ProtectedRoute from '@/components/shared/protected-route/ProtectedRoute'
import {
  CookieBanner,
  CookiePreferences,
  Footer,
  Navbar,
  NavbarVisiteur,
} from '@/components'
import { useAuth } from '@/hooks'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth()

  // Footer masqué pour les authentifiés (liens légaux accessibles via carte RGPD du Profil)
  // Visible pour les visiteurs sur /edition (conformité légale — mode visiteur first-class)
  const showFooter = authReady && !user

  return (
    <ProtectedRoute>
      <div className="layout">
        <div className="layout-main">
          <Navbar />
          <NavbarVisiteur />
          <main id="main-content">{children}</main>
          {showFooter && <Footer />}
          <CookieBanner />
          <CookiePreferences />
        </div>
      </div>
    </ProtectedRoute>
  )
}
