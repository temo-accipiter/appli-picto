'use client'

import type { ReactNode } from 'react'
import { CookieBanner, CookiePreferences, Footer } from '@/components'
import { useAuth } from '@/hooks'
import { shouldShowFooter } from '@/lib/layout/shouldShowFooter'
import { usePathname } from 'next/navigation'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, authReady } = useAuth()

  const isAuthenticated = authReady && !!user
  const showFooter = shouldShowFooter(pathname ?? '', isAuthenticated)

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
