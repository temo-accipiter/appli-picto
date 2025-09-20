import { LangSelector, PersonalizationModal, ThemeToggle, UserMenu } from '@/components'
import { usePermissions } from '@/contexts'
import { useAuth } from '@/hooks'
import { motion } from 'framer-motion'
import { LayoutDashboard, Palette, Pencil, Settings, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './Navbar.scss'

export default function Navbar() {
  const location = useLocation()
  const { user } = useAuth()
  const { can, isVisitor } = usePermissions()
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false)

  const isTableau = location.pathname === '/tableau'
  const isEdition = location.pathname === '/edition'
  const isProfil = location.pathname === '/profil'
  const isTableauDemo = location.pathname === '/tableau-demo'
  const isAdminPermissions = location.pathname === '/admin/permissions'

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
              aria-label="Accéder à l'édition"
              title="Édition"
            >
              <Pencil size={20} strokeWidth={2} />
            </NavLink>
          </motion.div>
        )}

        {(isEdition || isProfil || isAdminPermissions) /* ✅ aussi sur /profil et /admin/permissions */ && (
          <NavLink
            to="/tableau"
            className="nav-icon-link"
            aria-label="Accéder au tableau"
            title="Tableau"
          >
            <LayoutDashboard size={20} strokeWidth={2} />
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
            {isVisitor ? (
              // Boutons pour tous les visiteurs (tableau, tableau-demo, etc.)
              <>
                <button
                  className="nav-button personalize-button"
                  aria-label="Personnaliser"
                  title="Personnaliser votre expérience"
                  onClick={() => setShowPersonalizationModal(true)}
                >
                  <Palette size={18} />
                  <span>Personnalisation</span>
                </button>

                <NavLink
                  to="/signup"
                  className="nav-button signup-button"
                  aria-label="Créer un compte"
                  title="Créer un compte"
                >
                  <UserPlus size={18} />
                  <span>Créer un compte</span>
                </NavLink>

                <NavLink
                  to="/login"
                  className="nav-button login-button"
                  aria-label="Se connecter"
                  title="Se connecter"
                >
                  <Settings size={18} />
                  <span>Se connecter</span>
                </NavLink>
              </>
            ) : (
              // Boutons normaux pour les autres pages
              <>
                <NavLink
                  to="/signup"
                  className="nav-button signup-button"
                  aria-label="Créer un compte"
                  title="Créer un compte"
                >
                  <UserPlus size={18} />
                  <span>S'inscrire</span>
                </NavLink>

                <NavLink
                  to="/login"
                  className="nav-button login-button"
                  aria-label="Se connecter"
                  title="Se connecter"
                >
                  <Settings size={18} />
                  <span>Se connecter</span>
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

// PropTypes pour le composant Navbar
Navbar.propTypes = {
  // Aucune prop pour ce composant
}
