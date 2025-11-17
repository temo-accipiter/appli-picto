'use client'

import {
  CookieBanner,
  CookiePreferences,
  Footer,
  Navbar,
  PageTransition,
} from '@/components'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import './Layout.scss'

export default function Layout() {
  const { t } = useTranslation('common')
  const pathname = usePathname()
  const showNavbarRoutes = ['/profil', '/edition', '/tableau', '/tableau-demo']
  const showNavbar = showNavbarRoutes.includes(pathname)

  return (
    <div className="layout">
      {/* Skip link pour aller au contenu principal (WCAG 2.4.1) */}
      <a href="#main-content" className="skip-link">
        {t('accessibility.skipToContent')}
      </a>

      <div className="layout-main">
        {showNavbar && <Navbar />}
        <main id="main-content" aria-label={t('accessibility.skipToContent')}>
          <PageTransition />
        </main>
        <Footer />
        <CookieBanner />
        <CookiePreferences />
      </div>
    </div>
  )
}
