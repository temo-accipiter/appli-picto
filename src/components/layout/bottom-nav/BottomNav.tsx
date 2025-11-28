'use client'

import { useAuth, useI18n } from '@/hooks'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Pencil } from 'lucide-react'
import { UserMenu } from '@/components'
import './BottomNav.scss'

/**
 * BottomNav - Responsive navigation bar for mobile
 *
 * Mobile-first approach:
 * - On /tableau: show ONLY avatar (zen mode for autistic children)
 * - On other pages: show nav-icon-links + avatar (normal navbar, bottom position)
 * - Desktop: hidden (navbar remains at top)
 *
 * TSA-friendly: Minimal visual clutter on tableau page
 */
export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useI18n()

  const isTableau = pathname === '/tableau'
  const isEdition = pathname === '/edition'
  const isProfil = pathname === '/profil'
  const isAdminPermissions = pathname === '/admin/permissions'

  // Only show BottomNav on mobile and when needed
  // Desktop will keep top navbar
  const showNav = isTableau || isEdition || isProfil || isAdminPermissions

  if (!showNav || !user) {
    return null
  }

  return (
    <nav className="bottom-nav" role="navigation" aria-label={t('nav.main')}>
      <div className="bottom-nav__items">
        {/* Zen mode: tableau page = only avatar (no nav-icon-links) */}
        {!isTableau && (
          <>
            {/* Édition icon */}
            {(isTableau || isProfil || isAdminPermissions) && (
              <Link
                href="/edition"
                className="nav-icon-link"
                aria-label={t('nav.edition')}
                title={t('nav.edition')}
              >
                <Pencil size={20} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}

            {/* Tableau icon */}
            {(isEdition || isProfil || isAdminPermissions) && (
              <Link
                href="/tableau"
                className="nav-icon-link"
                aria-label={t('nav.tableau')}
                title={t('nav.tableau')}
              >
                <LayoutDashboard size={20} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </>
        )}

        {/* User avatar - always visible */}
        <UserMenu />
      </div>
    </nav>
  )
}
