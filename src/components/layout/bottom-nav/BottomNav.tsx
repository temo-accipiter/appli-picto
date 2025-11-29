'use client'

import { useAuth, useI18n } from '@/hooks'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Pencil } from 'lucide-react'
import { UserMenu, SettingsMenu } from '@/components'
import './BottomNav.scss'

/**
 * BottomNav - Responsive navigation bar with page-specific compositions
 *
 * /tableau (zen mode TSA-optimized):
 * - Mobile: bottom-right avatar only
 * - Desktop: top-right avatar only
 *
 * /edition (Mobile < 768px):
 * - Fixed bottom: Tableau, Avatar, Settings
 *
 * /profil (Mobile < 768px):
 * - Fixed bottom: Édition, Tableau, Avatar
 *
 * /admin (Mobile < 768px):
 * - Fixed bottom: Édition, Tableau, Avatar
 *
 * Desktop (≥ 768px):
 * - Hidden (navbar top remains)
 */
export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useI18n()

  const isTableau = pathname === '/tableau'
  const isEdition = pathname === '/edition'
  const isProfil = pathname === '/profil'
  const isAdmin = pathname.startsWith('/admin')

  // Only show BottomNav on specific pages
  const showNav = isTableau || isEdition || isProfil || isAdmin

  if (!showNav || !user) {
    return null
  }

  // Class conditionnelle pour position
  const navClass = isTableau
    ? 'bottom-nav bottom-nav--tableau'
    : 'bottom-nav bottom-nav--fixed'

  return (
    <nav className={navClass} role="navigation" aria-label={t('nav.main')}>
      <div className="bottom-nav__items">
        {/* /tableau: Avatar only (zen mode) */}
        {isTableau && <UserMenu />}

        {/* /edition: Tableau, Avatar, Settings */}
        {isEdition && (
          <>
            <Link
              href="/tableau"
              className="nav-icon-link"
              aria-label={t('nav.tableau')}
              title={t('nav.tableau')}
            >
              <LayoutDashboard size={24} strokeWidth={2} aria-hidden="true" />
            </Link>
            <UserMenu />
            <SettingsMenu />
          </>
        )}

        {/* /profil: Édition, Tableau, Avatar */}
        {isProfil && (
          <>
            <Link
              href="/edition"
              className="nav-icon-link"
              aria-label={t('nav.edition')}
              title={t('nav.edition')}
            >
              <Pencil size={24} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link
              href="/tableau"
              className="nav-icon-link"
              aria-label={t('nav.tableau')}
              title={t('nav.tableau')}
            >
              <LayoutDashboard size={24} strokeWidth={2} aria-hidden="true" />
            </Link>
            <UserMenu />
          </>
        )}

        {/* /admin: Édition, Tableau, Avatar */}
        {isAdmin && (
          <>
            <Link
              href="/edition"
              className="nav-icon-link"
              aria-label={t('nav.edition')}
              title={t('nav.edition')}
            >
              <Pencil size={24} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link
              href="/tableau"
              className="nav-icon-link"
              aria-label={t('nav.tableau')}
              title={t('nav.tableau')}
            >
              <LayoutDashboard size={24} strokeWidth={2} aria-hidden="true" />
            </Link>
            <UserMenu />
          </>
        )}
      </div>
    </nav>
  )
}
