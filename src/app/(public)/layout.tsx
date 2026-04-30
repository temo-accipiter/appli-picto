'use client'

import type { ReactNode } from 'react'
import { CookieBanner, CookiePreferences, Footer } from '@/components'
import { useAuth } from '@/hooks'
import { usePathname } from 'next/navigation'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, authReady } = useAuth()

  // Sur /tableau (kiosk mode TSA) : masqué pour les authentifiés, visible pour les visiteurs
  // Sur toutes les autres routes publiques : toujours visible
  const isAuthenticated = authReady && !!user
  const showFooter = !(pathname === '/tableau' && isAuthenticated)

  return (
    <div className="layout">
      <div className="layout-main">
        <main id="main-content">{children}</main>
        {showFooter && <Footer />}
        <CookieBanner />
        <CookiePreferences />
      </div>
    </div>
  )
}
