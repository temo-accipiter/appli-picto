import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggle, LangSelector, Toast, Button } from '@/components'
import { Pencil, LayoutDashboard } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks'
import './Navbar.scss'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [toastVisible, setToastVisible] = useState(false)
  const isTableau = location.pathname.startsWith('/tableau')

  const handleSignOut = async () => {
    await signOut()
    navigate('/tableau')
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  return (
    <>
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

        {!isTableau && user && (
          <motion.div
            className="navbar-actions"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <LangSelector />
            <ThemeToggle />
            <NavLink to="/profil" className="nav-button">
              Mon profil
            </NavLink>
            <Button
              onClick={handleSignOut}
              label="Se déconnecter"
              variant="secondary"
            />
          </motion.div>
        )}
      </nav>

      <Toast
        message="Déconnexion réussie !"
        type="success"
        visible={toastVisible}
      />
    </>
  )
}
