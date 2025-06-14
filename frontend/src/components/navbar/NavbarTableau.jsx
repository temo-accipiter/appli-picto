import { NavLink } from 'react-router-dom'

export default function NavbarTableau() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <NavLink
          to="/edition"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          Édition
        </NavLink>
      </div>
      <div className="navbar-actions" />
    </nav>
  )
}
