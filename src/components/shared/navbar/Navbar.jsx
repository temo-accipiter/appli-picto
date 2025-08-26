import { UserMenu } from '@/components'
import { useAuth } from '@/hooks'
import { motion } from 'framer-motion'
import { LayoutDashboard, Pencil } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import './Navbar.scss'

export default function Navbar() {
  const location = useLocation()
  const { user } = useAuth()

  const isTableau = location.pathname === '/tableau'
  const isEdition = location.pathname === '/edition'
  const isProfil = location.pathname === '/profil' // ✅ nouveau

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {(isTableau || isProfil) /* ✅ aussi sur /profil */ && (
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

        {(isEdition || isProfil) /* ✅ aussi sur /profil */ && (
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

      {/* Actions à droite : seulement le UserMenu */}
      {user && (
        <motion.div
          className="navbar-actions"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <UserMenu />
        </motion.div>
      )}
    </nav>
  )
}

// PropTypes pour le composant Navbar
Navbar.propTypes = {
  // Aucune prop pour ce composant
}
