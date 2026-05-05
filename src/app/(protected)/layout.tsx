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
import { shouldShowFooter } from '@/lib/layout/shouldShowFooter'
import { usePathname } from 'next/navigation'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth()
  const pathname = usePathname()

  const isAuthenticated = authReady && !!user
  const showFooter = shouldShowFooter(pathname ?? '', isAuthenticated)

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
