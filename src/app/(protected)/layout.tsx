'use client'

import type { ReactNode } from 'react'
import ProtectedRoute from '@/components/shared/protected-route/ProtectedRoute'
import { CookieBanner, CookiePreferences, Footer, Navbar } from '@/components'
import { usePathname } from 'next/navigation'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const showNavbarRoutes = ['/profil', '/edition', '/abonnement', '/admin']
  const showNavbar = showNavbarRoutes.some(route => pathname.startsWith(route))

  // Masquer footer sur pages avec BottomNav mobile (/edition, /profil, /admin)
  // Sur mobile, BottomNav remplace navbar+footer
  const hideFooterRoutes = ['/edition', '/profil', '/admin']
  const showFooter = !hideFooterRoutes.some(route => pathname.startsWith(route))

  return (
    <ProtectedRoute>
      <div className="layout">
        <div className="layout-main">
          {showNavbar && (
            <div className="navbar-desktop-only">
              <Navbar />
            </div>
          )}
          <main id="main-content">{children}</main>
          {showFooter && <Footer />}
          <CookieBanner />
          <CookiePreferences />
        </div>
      </div>
    </ProtectedRoute>
  )
}
