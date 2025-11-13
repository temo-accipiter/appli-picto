import {
  LangSelector,
  PersonalizationModal,
  ThemeToggle,
  UserMenu,
} from '@/components'
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
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './Navbar.scss'

export default function Navbar() {
  const location = useLocation()
  const { user } = useAuth()
  const { can: _can, isVisitor, ready } = usePermissions()
  const { t } = useI18n() // 🌐 Hook i18n pour les traductions
  const [showPersonalizationModal, setShowPersonalizationModal] =
    useState(false)

  const isTableau = location.pathname === '/tableau'
  const isEdition = location.pathname === '/edition'
  const isProfil = location.pathname === '/profil'
  const isAdminPermissions = location.pathname === '/admin/permissions'

  // 🔧 CORRECTIF : Détecter visitor même pendant le chargement
  const isVisitorMode = !user && (isVisitor || !ready)

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {(isTableau || isProfil || isAdminPermissions) && !isVisitor && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <NavLink
              to="/edition"
              className="nav-icon-link"
              aria-label={t('nav.edition')}
              title={t('nav.edition')}
            >
              <Pencil size={20} strokeWidth={2} aria-hidden="true" />
            </NavLink>
          </motion.div>
        )}

        {(isEdition ||
          isProfil ||
          isAdminPermissions) /* ✅ aussi sur /profil et /admin/permissions */ && (
          <NavLink
            to="/tableau"
            className="nav-icon-link"
            aria-label={t('nav.tableau')}
            title={t('nav.tableau')}
          >
            <LayoutDashboard size={20} strokeWidth={2} aria-hidden="true" />
          </NavLink>
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

                <NavLink
                  to="/signup"
                  className="nav-button signup-button"
                  aria-label={t('nav.createAccount')}
                  title={t('nav.createAccount')}
                >
                  <UserPlus size={18} aria-hidden="true" />
                  <span>{t('nav.createAccount')}</span>
                </NavLink>

                <NavLink
                  to="/login"
                  className="nav-button login-button"
                  aria-label={t('nav.login')}
                  title={t('nav.login')}
                >
                  <Settings size={18} aria-hidden="true" />
                  <span>{t('nav.login')}</span>
                </NavLink>
              </>
            ) : (
              // Boutons normaux pour les autres pages
              <>
                <NavLink
                  to="/signup"
                  className="nav-button signup-button"
                  aria-label={t('nav.signup')}
                  title={t('nav.signup')}
                >
                  <UserPlus size={18} aria-hidden="true" />
                  <span>{t('nav.signup')}</span>
                </NavLink>

                <NavLink
                  to="/login"
                  className="nav-button login-button"
                  aria-label={t('nav.login')}
                  title={t('nav.login')}
                >
                  <Settings size={18} aria-hidden="true" />
                  <span>{t('nav.login')}</span>
                </NavLink>
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
