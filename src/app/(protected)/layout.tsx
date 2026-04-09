'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/shared/protected-route/ProtectedRoute'
import { CookieBanner, CookiePreferences, Footer, Navbar } from '@/components'
import { usePathname } from 'next/navigation'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Détection mobile au montage
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      const isMobileNow = window.innerWidth < 768
      setIsMobile(isMobileNow)
      if (process.env.NODE_ENV === 'development') {
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Routes où la navbar desktop est affichée (uniquement desktop)
  const navbarRoutes = ['/profil', '/edition', '/abonnement']
  const isNavbarRoute = navbarRoutes.some(route => pathname.startsWith(route))

  // Footer caché sur mobile pour les routes d'édition et de profil
  // Sur desktop, footer toujours visible
  const footerMobileHiddenRoutes = ['/edition', '/profil']
  const footerMobileHidden = footerMobileHiddenRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Navbar affichée UNIQUEMENT sur desktop (≥768px) pour certaines routes
  const shouldShowNavbar = mounted && isNavbarRoute && !isMobile

  return (
    <ProtectedRoute>
      <div className="layout">
        <div className="layout-main">
          {/* Navbar visible UNIQUEMENT sur desktop (≥768px) */}
          {shouldShowNavbar && (
            <div className="navbar-desktop-only">
              <Navbar />
            </div>
          )}
          <main id="main-content">{children}</main>
          <div className={footerMobileHidden ? 'footer-desktop-only' : ''}>
            <Footer />
          </div>
          <CookieBanner />
          <CookiePreferences />
        </div>
      </div>
    </ProtectedRoute>
  )
}
