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
        console.log(
          '[Layout] isMobile:',
          isMobileNow,
          'width:',
          window.innerWidth
        )
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Routes où la navbar peut être affichée (uniquement desktop)
  const navbarRoutes = ['/profil', '/edition', '/abonnement', '/admin']
  const isNavbarRoute = navbarRoutes.some(route => pathname.startsWith(route))

  // Footer caché sur mobile UNIQUEMENT pour /edition, /profil, /admin
  // Sur desktop, footer toujours visible
  const footerMobileHiddenRoutes = ['/edition', '/profil', '/admin']
  const footerMobileHidden = footerMobileHiddenRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Navbar affichée UNIQUEMENT sur desktop (≥768px) pour certaines routes
  const shouldShowNavbar = mounted && isNavbarRoute && !isMobile

  // Debug log
  if (process.env.NODE_ENV === 'development' && pathname.startsWith('/admin')) {
    console.log('[Layout /admin]', {
      pathname,
      mounted,
      isNavbarRoute,
      isMobile,
      shouldShowNavbar,
    })
  }

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
