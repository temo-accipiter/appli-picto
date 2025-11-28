'use client'

import {
  LangSelector,
  PersonalizationModal,
  SettingsMenu,
  ThemeToggle,
  UserMenu,
} from '@/components'
import { HomeButton } from '@/components/layout/home-button'
import { usePermissions } from '@/contexts'
import { useAuth, useI18n } from '@/hooks'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Palette,
  Pencil,
  Settings,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import './Navbar.scss'

export default function Navbar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { can: _can, isVisitor, ready } = usePermissions()
  const { t } = useI18n() // 🌐 Hook i18n pour les traductions
  const [showPersonalizationModal, setShowPersonalizationModal] =
    useState(false)

  const isTableau = pathname === '/tableau'
  const isEdition = pathname === '/edition'
  const isProfil = pathname === '/profil'
  const isAdminPermissions = pathname === '/admin/permissions'

  // 🔧 CORRECTIF : Détecter visitor même pendant le chargement
  const isVisitorMode = !user && (isVisitor || !ready)

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {/* Home Button - "Panic button" toujours accessible */}
        <HomeButton />

        {(isTableau || isProfil || isAdminPermissions) && !isVisitor && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              href="/edition"
              className="nav-icon-link"
              aria-label={t('nav.edition')}
              title={t('nav.edition')}
            >
              <Pencil size={20} strokeWidth={2} aria-hidden="true" />
            </Link>
          </motion.div>
        )}

        {(isEdition ||
          isProfil ||
          isAdminPermissions) /* ✅ aussi sur /profil et /admin/permissions */ && (
          <Link
            href="/tableau"
            className="nav-icon-link"
            aria-label={t('nav.tableau')}
            title={t('nav.tableau')}
          >
            <LayoutDashboard size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* Actions à droite : UserMenu pour les utilisateurs connectés, actions pour les visiteurs */}
      {user ? (
        <motion.div
          className="navbar-actions"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {isEdition && <SettingsMenu />}
          <UserMenu />
        </motion.div>
      ) : (
        <motion.div
          className="navbar-actions visitor-actions"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Thème et langue pour tous */}
          <div className="visitor-controls">
            <ThemeToggle />
            <LangSelector />
          </div>

          {/* Boutons de conversion pour les visiteurs */}
          <div className="visitor-buttons">
            {isVisitorMode ? (
              // Boutons pour tous les visiteurs (tableau, tableau-demo, etc.)
              <>
                <button
                  className="nav-button personalize-button"
                  aria-label={t('nav.personalization')}
                  title={t('nav.personalization')}
                  onClick={() => setShowPersonalizationModal(true)}
                >
                  <Palette size={18} aria-hidden="true" />
                  <span>{t('nav.personalization')}</span>
                </button>

                <Link
                  href="/signup"
                  className="nav-button signup-button"
                  aria-label={t('nav.createAccount')}
                  title={t('nav.createAccount')}
                >
                  <UserPlus size={18} aria-hidden="true" />
                  <span>{t('nav.createAccount')}</span>
                </Link>

                <Link
                  href="/login"
                  className="nav-button login-button"
                  aria-label={t('nav.login')}
                  title={t('nav.login')}
                >
                  <Settings size={18} aria-hidden="true" />
                  <span>{t('nav.login')}</span>
                </Link>
              </>
            ) : (
              // Boutons normaux pour les autres pages
              <>
                <Link
                  href="/signup"
                  className="nav-button signup-button"
                  aria-label={t('nav.signup')}
                  title={t('nav.signup')}
                >
                  <UserPlus size={18} aria-hidden="true" />
                  <span>{t('nav.signup')}</span>
                </Link>

                <Link
                  href="/login"
                  className="nav-button login-button"
                  aria-label={t('nav.login')}
                  title={t('nav.login')}
                >
                  <Settings size={18} aria-hidden="true" />
                  <span>{t('nav.login')}</span>
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Modal de personnalisation pour les visiteurs */}
      <PersonalizationModal
        isOpen={showPersonalizationModal}
        onClose={() => setShowPersonalizationModal(false)}
      />
    </nav>
  )
}
