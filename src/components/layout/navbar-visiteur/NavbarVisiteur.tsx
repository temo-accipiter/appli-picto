'use client'

import { useIsVisitor, useI18n } from '@/hooks'
import { revokeConsent } from '@/utils/consent'
import { LayoutDashboard, Pencil } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import './NavbarVisiteur.scss'

/**
 * NavbarVisiteur — Barre de navigation pour les visiteurs non connectés
 *
 * Visible uniquement si :
 * - Utilisateur NON authentifié (mode visiteur)
 * - Route = /edition (pas /tableau qui reste kiosk total)
 *
 * Mobile (<1024px) : Logo · ☰ Menu · Se connecter · S'inscrire
 * Desktop (≥1024px) : Logo · Édition · Tableau · ☰ Menu · Se connecter · Créer un compte
 *
 * Le menu contient les liens légaux + gestion cookies.
 */
export default function NavbarVisiteur() {
  const pathname = usePathname()
  const { isVisitor, authReady } = useIsVisitor()
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

  const isEdition = pathname?.startsWith('/edition') ?? false
  const isTableau = pathname === '/tableau'
  const shouldShow = authReady && isVisitor && isEdition

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    menuTriggerRef.current?.focus()
  }, [])

  // Fermer au clic extérieur
  useEffect(() => {
    if (!menuOpen) return
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuTriggerRef.current &&
        !menuTriggerRef.current.contains(target)
      ) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen, closeMenu])

  // Fermer à l'ESC
  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen, closeMenu])

  if (!shouldShow) return null

  const handleRefuserCookies = () => {
    if (revokeConsent()) {
      window.location.reload()
    }
  }

  const handlePersonnaliser = () => {
    window.dispatchEvent(new CustomEvent('open-cookie-preferences'))
    closeMenu()
  }

  return (
    <header className="navbar-visiteur-header">
      <nav className="navbar-visiteur" aria-label="Navigation visiteur">
        <div className="navbar-visiteur__inner">
          {/* Logo */}
          <Link
            href="/edition"
            className="navbar-visiteur__logo"
            aria-label="Appli-Picto — Accueil"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 56 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="navbar-visiteur__logo-icon"
            >
              <rect width="56" height="56" rx="12" fill="currentColor" />
              <rect x="11" y="11" width="14" height="14" rx="2" fill="white" />
              <rect x="31" y="11" width="14" height="14" rx="2" fill="white" />
              <rect x="11" y="31" width="14" height="14" rx="2" fill="white" />
              <rect x="31" y="31" width="14" height="14" rx="2" fill="white" />
            </svg>
            <span className="navbar-visiteur__logo-text">Appli-Picto</span>
          </Link>

          {/* Liens nav desktop — masqués sur mobile via CSS */}
          <div className="navbar-visiteur__nav-desktop">
            <Link
              href="/edition"
              className={`navbar-visiteur__nav-link${isEdition ? ' navbar-visiteur__nav-link--active' : ''}`}
              aria-current={isEdition ? 'page' : undefined}
            >
              <Pencil
                size={20}
                strokeWidth={2}
                aria-hidden="true"
                className="navbar-visiteur__nav-icon"
              />
              Édition
            </Link>
            <Link
              href="/tableau"
              className={`navbar-visiteur__nav-link${isTableau ? ' navbar-visiteur__nav-link--active' : ''}`}
              aria-current={isTableau ? 'page' : undefined}
            >
              <LayoutDashboard
                size={20}
                strokeWidth={2}
                aria-hidden="true"
                className="navbar-visiteur__nav-icon"
              />
              Tableau
            </Link>
          </div>

          {/* Actions droite */}
          <div className="navbar-visiteur__actions">
            {/* Bouton menu — burger identique à SettingsMenu */}
            <button
              ref={menuTriggerRef}
              type="button"
              className={`navbar-visiteur__menu-btn${menuOpen ? ' navbar-visiteur__menu-btn--active' : ''}`}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              aria-controls="visiteur-menu"
              onClick={() => setMenuOpen(v => !v)}
            >
              <span className="navbar-visiteur__burger" aria-hidden="true">
                <span className="navbar-visiteur__burger-line" />
                <span className="navbar-visiteur__burger-line" />
                <span className="navbar-visiteur__burger-line" />
              </span>
            </button>

            {/* Se connecter */}
            <Link href="/login" className="navbar-visiteur__login">
              Se connecter
            </Link>

            {/* CTA — S'inscrire (mobile) / Créer un compte (desktop) */}
            <Link
              href="/signup"
              className="navbar-visiteur__cta"
              aria-label="Créer un compte"
            >
              <span className="navbar-visiteur__cta-short" aria-hidden="true">
                S&apos;inscrire
              </span>
              <span className="navbar-visiteur__cta-long" aria-hidden="true">
                Créer un compte
              </span>
            </Link>
          </div>
        </div>

        {/* Menu légal — drawer mobile / dropdown desktop */}
        {menuOpen && (
          <div
            id="visiteur-menu"
            ref={menuRef}
            className="navbar-visiteur__menu"
          >
            {/* Liens nav — visibles uniquement sur mobile (desktop : dans la top-nav) */}
            <div className="navbar-visiteur__menu-nav">
              <Link
                href="/edition"
                className="navbar-visiteur__menu-item"
                onClick={closeMenu}
              >
                <Pencil
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="navbar-visiteur__menu-icon"
                />
                Édition
              </Link>
              <Link
                href="/tableau"
                className="navbar-visiteur__menu-item"
                onClick={closeMenu}
              >
                <LayoutDashboard
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="navbar-visiteur__menu-icon"
                />
                Tableau
              </Link>
            </div>

            <span
              className="navbar-visiteur__menu-sep navbar-visiteur__menu-sep--after-nav"
              role="separator"
              aria-hidden="true"
            />

            {/* Liens légaux */}
            <Link
              href="/legal/mentions-legales"
              className="navbar-visiteur__menu-item"
              onClick={closeMenu}
            >
              {t('legal.mentions')}
            </Link>
            <Link
              href="/legal/politique-confidentialite"
              className="navbar-visiteur__menu-item"
              onClick={closeMenu}
            >
              Confidentialité
            </Link>
            <Link
              href="/legal/cgu"
              className="navbar-visiteur__menu-item"
              aria-label="Conditions générales d'utilisation"
              onClick={closeMenu}
            >
              CGU
            </Link>
            <Link
              href="/legal/cgv"
              className="navbar-visiteur__menu-item"
              aria-label="Conditions générales de vente"
              onClick={closeMenu}
            >
              CGV
            </Link>
            <Link
              href="/legal/politique-cookies"
              className="navbar-visiteur__menu-item"
              onClick={closeMenu}
            >
              Cookies
            </Link>

            <span
              className="navbar-visiteur__menu-sep"
              role="separator"
              aria-hidden="true"
            />

            {/* Gestion cookies */}
            <button
              type="button"
              className="navbar-visiteur__menu-item navbar-visiteur__menu-item--btn"
              onClick={handleRefuserCookies}
            >
              {t('cookies.refuse')}
            </button>
            <button
              type="button"
              className="navbar-visiteur__menu-item navbar-visiteur__menu-item--btn"
              onClick={handlePersonnaliser}
            >
              {t('cookies.customize')}
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}
