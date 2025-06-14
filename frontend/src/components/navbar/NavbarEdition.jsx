import { NavLink } from 'react-router-dom'
import ThemeToggle from '@/components/theme-toggle/ThemeToggle'
import LangSelector from '@/components/lang-selector/LangSelector'

export default function NavbarEdition() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <NavLink
          to="/tableau"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          Tableau
        </NavLink>
      </div>
      <div className="navbar-actions">
        <LangSelector />
        <ThemeToggle />
      </div>
    </nav>
  )
}
