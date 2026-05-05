'use client'

import { useAuth, useI18n, useAccountStatus } from '@/hooks'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Pencil, User, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './BottomNav.scss'

/**
 * BottomNav — Navigation principale mobile (authentifiés uniquement)
 *
 * Visible uniquement si :
 * - Utilisateur authentifié
 * - Page ≠ /tableau (zen mode TSA — pas de distraction)
 *
 * Composition :
 * - Non-admin (3 icônes) : Tableau · Édition · Profil
 * - Admin (4 icônes) : Tableau · Édition · Profil · Admin
 *
 * Masqué sur desktop ≥ 768px (navbar top prend le relai)
 */

interface NavItem {
  href: string
  label: string
  ariaLabel: string
  Icon: LucideIcon
  active: boolean
}

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isAdmin } = useAccountStatus()
  const { t } = useI18n()

  // Visible uniquement sur les pages app — masqué sur /tableau (kiosk), pages légales, auth, 404
  const appRoutes = ['/edition', '/profil', '/admin', '/abonnement']
  if (!user || !appRoutes.some(r => pathname?.startsWith(r))) return null

  const isEdition = pathname?.startsWith('/edition') ?? false
  const isProfil = pathname?.startsWith('/profil') ?? false
  const isAdminPage = pathname?.startsWith('/admin') ?? false

  const navItems: NavItem[] = [
    {
      href: '/tableau',
      label: t('nav.tableau'),
      ariaLabel: t('nav.tableau'),
      Icon: LayoutDashboard,
      // /tableau n'est jamais actif ici (on return null dessus), mais l'item reste cliquable
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
    <nav className="bottom-nav" aria-label={t('nav.main')}>
      {navItems.map(({ href, label, ariaLabel, Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}
          aria-label={ariaLabel}
          aria-current={active ? 'page' : undefined}
        >
          <Icon
            size={24}
            strokeWidth={2}
            aria-hidden="true"
            className="bottom-nav__icon"
          />
          <span className="bottom-nav__label">{label}</span>
        </Link>
      ))}
    </nav>
  )
}
