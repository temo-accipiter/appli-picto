'use client'

import type { ReactNode } from 'react'
import { CookieBanner, CookiePreferences, Footer, Navbar } from '@/components'
import { usePathname } from 'next/navigation'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Afficher la navbar seulement sur tableau et time-timer
  const showNavbarRoutes = ['/tableau', '/time-timer']
  const showNavbar = showNavbarRoutes.some(route => pathname.startsWith(route))

  return (
    <div className="layout">
      <div className="layout-main">
        {showNavbar && <Navbar />}
        <main id="main-content">{children}</main>
        <Footer />
        <CookieBanner />
        <CookiePreferences />
      </div>
    </div>
  )
}
