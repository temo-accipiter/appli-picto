'use client'

import { useAuth, useI18n, useIsVisitor } from '@/hooks'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Pencil } from 'lucide-react'
import { UserMenu, SettingsMenu } from '@/components'
import './BottomNav.scss'

/**
 * BottomNav - Responsive navigation bar with page-specific compositions
 *
 * ✅ CONTRAT PRODUIT : Visitor DOIT pouvoir naviguer entre /tableau et /edition
 *
 * /tableau (zen mode TSA-optimized):
 * - Mobile (User): bottom-right avatar only
 * - Mobile (Visitor): lien Édition uniquement
 * - Desktop: top-right avatar only
 *
 * /edition (Mobile < 768px):
 * - User: Fixed bottom Tableau, Avatar, Settings
 * - Visitor: Fixed bottom Tableau
 *
 * /profil (Mobile < 768px):
 * - User: Fixed bottom Édition, Tableau, Avatar
 * - Visitor: n/a (PrivateRoute bloque accès)
 *
 * Desktop (≥ 768px):
 * - Hidden (navbar top remains)
 */
export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isVisitor } = useIsVisitor()
  const { t } = useI18n()

  const isTableau = pathname === '/tableau'
  const isEdition = pathname === '/edition'
  const isProfil = pathname === '/profil'

  // Only show BottomNav on specific pages
  const showNav = isTableau || isEdition || isProfil

  // ✅ AUTORISER Visitor sur /tableau et /edition (contrat produit)
  // Bloquer UNIQUEMENT si ni user, ni visitor
  if (!showNav || (!user && !isVisitor)) {
    return null
  }

  // Class conditionnelle pour position
  const navClass = isTableau
    ? 'bottom-nav bottom-nav--tableau'
    : 'bottom-nav bottom-nav--fixed'

  return (
    <nav className={navClass} role="navigation" aria-label={t('nav.main')}>
      <div className="bottom-nav__items">
        {/* /tableau: Avatar (user) OU lien Édition (visitor) */}
        {isTableau && (
          <>
            {user ? (
              <UserMenu />
            ) : (
              <Link
                href="/edition"
                className="nav-icon-link"
                aria-label={t('nav.edition')}
                title={t('nav.edition')}
              >
                <Pencil size={24} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </>
        )}

        {/* /edition: Tableau (toujours) + Avatar, Settings (user uniquement) */}
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
            {user && (
              <>
                <UserMenu />
                <SettingsMenu />
              </>
            )}
          </>
        )}

        {/* /profil: Édition, Tableau, Avatar (user uniquement - visitor bloqué par PrivateRoute) */}
        {isProfil && user && (
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
