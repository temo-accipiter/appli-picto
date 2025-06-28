import { NavLink, useLocation } from 'react-router-dom'
import { ThemeToggle, LangSelector } from '@/components'
import { Pencil, LayoutDashboard } from 'lucide-react'
import { motion } from 'framer-motion'
import './Navbar.scss'

export default function Navbar() {
  const location = useLocation()
  const isTableau = location.pathname.startsWith('/tableau')

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {isTableau ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <NavLink
              to="/edition"
              className="nav-icon-link"
              aria-label="Accéder à l’édition"
              title="Édition"
            >
              <Pencil size={20} strokeWidth={2} />
            </NavLink>
          </motion.div>
        ) : (
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

      {!isTableau && (
        <motion.div
          className="navbar-actions"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <LangSelector />
          <ThemeToggle />
        </motion.div>
      )}
    </nav>
  )
}
