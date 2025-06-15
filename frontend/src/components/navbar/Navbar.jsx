import { useLocation } from 'react-router-dom'
import NavbarEdition from './navbar-edition/NavbarEdition'
import NavbarTableau from './navbar-tableau/NavbarTableau'
import './Navbar.scss'

export default function Navbar() {
  const location = useLocation()
  if (location.pathname.startsWith('/edition')) {
    return <NavbarEdition />
  }
  return <NavbarTableau />
}
