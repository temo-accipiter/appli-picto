'use client'

import type { ReactNode } from 'react'
import ProtectedRoute from '@/components/shared/protected-route/ProtectedRoute'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { CookieBanner, CookiePreferences, Footer, Navbar } from '@/components'
import { usePathname } from 'next/navigation'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const showNavbarRoutes = ['/profil', '/edition', '/abonnement', '/admin']
  const showNavbar = showNavbarRoutes.some(route => pathname.startsWith(route))

  return (
    <ProtectedRoute>
      <div className="layout">
        <div className="layout-main">
          {showNavbar && <Navbar />}
          <Breadcrumbs />
          <main id="main-content">{children}</main>
          <Footer />
          <CookieBanner />
          <CookiePreferences />
        </div>
      </div>
    </ProtectedRoute>
  )
}
