import { NavLink } from 'react-router-dom'
import LangSelector from '@/components/lang-selector/LangSelector'
import ThemeToggle from '@/components/theme-toggle/ThemeToggle'

export default function NavbarEdition() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <NavLink
          to="/"
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
