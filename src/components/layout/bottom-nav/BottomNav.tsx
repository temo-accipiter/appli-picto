'use client'

import { useAuth, useI18n } from '@/hooks'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Edit3, Home, MoreVertical, Settings, User } from 'lucide-react'
import BottomNavItem from './BottomNavItem'
import './BottomNav.scss'

interface NavItemConfig {
  icon: typeof Home
  labelKey: string
  path: string
  visibleWhen?: 'always' | 'authenticated' | 'visitor'
}

/**
 * BottomNav - Navigation Bar inférieure pour mobile (< 768px)
 *
 * Points clés:
 * - Affichage SEULEMENT sur mobile (< 768px) via CSS
 * - Adaptive: différents items selon authentication
 * - Dropdown menu pour actions additionnelles
 * - WCAG 2.2 AA compliant (aria-current, touch targets, keyboard)
 *
 * Hiérarchie:
 * - Item 1: Tableau (Home)
 * - Item 2: Édition (Edit) - si authentifié
 * - Item 3: Profil (User) - si authentifié
 * - Item 4: Plus (Menu) - actions additionnelles
 *
 * Contenu du menu "Plus":
 * - Paramètres
 * - Thème
 * - Langue
 * - Déconnexion (si authentifié)
 */
export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { t } = useI18n()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)

  // Items de navigation principaux
  const navItems: NavItemConfig[] = [
    {
      icon: Home,
      labelKey: 'nav.tableau',
      path: '/tableau',
      visibleWhen: 'always',
    },
    {
      icon: Edit3,
      labelKey: 'nav.edition',
      path: '/edition',
      visibleWhen: 'authenticated',
    },
    {
      icon: User,
      labelKey: 'nav.profil',
      path: '/profil',
      visibleWhen: 'authenticated',
    },
  ]

  // Filtrer les items selon authentication
  const filteredItems = navItems.filter(item => {
    if (item.visibleWhen === 'always') return true
    if (item.visibleWhen === 'authenticated') return !!user
    return false
  })

  // Fermer le menu "Plus" quand on clique dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target as Node)
      ) {
        setShowMoreMenu(false)
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

  // Fermer le menu au changement de route
  useEffect(() => {
    setShowMoreMenu(false)
  }, [pathname])

  // Handler pour navigation
  const handleNavigation = (path: string) => {
    router.push(path)
    setShowMoreMenu(false)
  }

  // Handler pour déconnexion
  const handleSignOut = async () => {
    await signOut()
    setShowMoreMenu(false)
    router.push('/tableau')
  }

  return (
    <nav className="bottom-nav" role="navigation" aria-label={t('nav.main')}>
      {/* Items principaux */}
      <div className="bottom-nav__items">
        {filteredItems.map(item => (
          <BottomNavItem
            key={item.path}
            icon={item.icon}
            label={t(item.labelKey)}
            path={item.path}
            isActive={pathname === item.path}
            onClick={() => handleNavigation(item.path)}
          />
        ))}

        {/* Button "Plus" - Dropdown trigger */}
        <div className="bottom-nav__more-container" ref={moreButtonRef}>
          <BottomNavItem
            icon={MoreVertical}
            label={t('nav.more')}
            isActive={showMoreMenu}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            hasDropdown
            className="bottom-nav__more-button"
          />

          {/* Dropdown Menu */}
          {showMoreMenu && (
            <div className="bottom-nav__menu" ref={moreMenuRef} role="menu">
              <button
                className="bottom-nav__menu-item"
                onClick={() => router.push('/profil#settings')}
                role="menuitem"
              >
                <Settings size={20} aria-hidden="true" />
                <span>{t('nav.settings')}</span>
              </button>

              {user && (
                <button
                  className="bottom-nav__menu-item bottom-nav__menu-item--danger"
                  onClick={handleSignOut}
                  role="menuitem"
                >
                  <span>{t('nav.logout')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Spacer pour éviter overlap au scroll */}
      <div className="bottom-nav__spacer" aria-hidden="true" />
    </nav>
  )
}
