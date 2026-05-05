'use client'

import { SettingsMenu } from '@/components'
import { useAuth, useI18n, useAccountStatus } from '@/hooks'
import { LayoutDashboard, Pencil, User, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './Navbar.scss'

/**
 * Navbar — Navigation principale desktop (≥1024px)
 *
 * Visible uniquement si :
 * - Viewport ≥ 1024px (CSS)
 * - Utilisateur authentifié
 * - Page ≠ /tableau (kiosk mode TSA — pas de distraction)
 *
 * Composition :
 * - Logo Appli-Picto à gauche (lien vers /edition)
 * - Non-admin (3 icônes) : Tableau · Édition · Profil
 * - Admin (4 icônes) : Tableau · Édition · Profil · Admin
 * - SettingsMenu (sur /edition uniquement, hors nav)
 *
 * Sur mobile (< 1024px) : BottomNav prend le relai
 */

interface NavItem {
  href: string
  label: string
  ariaLabel: string
  Icon: LucideIcon
  active: boolean
}

export default function Navbar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isAdmin } = useAccountStatus()
  const { t } = useI18n()

  // Masquée sur /tableau (kiosk mode TSA) et pour les non-authentifiés
  if (!user || pathname === '/tableau') return null

  const isEdition = pathname?.startsWith('/edition') ?? false
  const isProfil = pathname?.startsWith('/profil') ?? false
  const isAdminPage = pathname?.startsWith('/admin') ?? false

  const navItems: NavItem[] = [
    {
      href: '/tableau',
      label: t('nav.tableau'),
      ariaLabel: t('nav.tableau'),
      Icon: LayoutDashboard,
      // /tableau masque la navbar → cet item n'est jamais "actif" ici
      active: false,
    },
    {
      href: '/edition',
      label: t('nav.edition'),
      ariaLabel: t('nav.edition'),
      Icon: Pencil,
      active: isEdition,
    },
    {
      href: '/profil',
      label: t('nav.profil'),
      ariaLabel: t('nav.profil'),
      Icon: User,
      active: isProfil,
    },
  ]

  if (isAdmin) {
    navItems.push({
      href: '/admin',
      label: 'Admin',
      ariaLabel: 'Administration',
      Icon: Shield,
      active: isAdminPage,
    })
  }

  return (
    <header className="navbar-header">
      {/* Lien d'évitement — WCAG 2.4.1 Contourner des blocs */}
      <a href="#main-content" className="skip-link">
        {t('nav.skipToContent')}
      </a>

      <nav className="navbar" aria-label={t('nav.main')}>
        {/* Wrapper interne centré — aligne le contenu sur le body principal */}
        <div className="navbar__inner">
          {/* Logo — gauche */}
          <Link
            href="/edition"
            className="navbar-logo"
            aria-label="Appli-Picto — Retour à l'accueil"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 56 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="navbar-logo__icon"
            >
              <rect width="56" height="56" rx="12" fill="currentColor" />
              <rect x="11" y="11" width="14" height="14" rx="2" fill="white" />
              <rect x="31" y="11" width="14" height="14" rx="2" fill="white" />
              <rect x="11" y="31" width="14" height="14" rx="2" fill="white" />
              <rect x="31" y="31" width="14" height="14" rx="2" fill="white" />
            </svg>
            <span className="navbar-logo__text">Appli-Picto</span>
          </Link>

          {/* Actions — droite */}
          <div className="navbar-actions">
            {/* SettingsMenu : outil contextuel page Édition, hors navigation */}
            {isEdition && <SettingsMenu />}

            {/* Icônes de navigation */}
            {navItems.map(({ href, label, ariaLabel, Icon, active }) => (
              <Link
                key={href}
                href={href}
                className={`navbar__item${active ? ' navbar__item--active' : ''}`}
                aria-label={ariaLabel}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="navbar__icon"
                />
                <span className="navbar__label">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  )
}
