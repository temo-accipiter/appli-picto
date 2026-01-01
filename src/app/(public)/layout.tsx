'use client'

import type { ReactNode } from 'react'
import { CookieBanner, CookiePreferences, Footer, Navbar } from '@/components'
import { usePathname } from 'next/navigation'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Navbar masquée sur toutes les routes publiques (zen mode TSA-optimized)
  const showNavbar = false

  // Masquer le footer sur /tableau (zen mode TSA-optimized)
  const showFooter = pathname !== '/tableau'

  return (
    <div className="layout">
      <div className="layout-main">
        {showNavbar && <Navbar />}
        <main id="main-content">{children}</main>
        {showFooter && <Footer />}
        <CookieBanner />
        <CookiePreferences />
      </div>
    </div>
  )
}
