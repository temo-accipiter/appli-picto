import { useLocation } from 'react-router-dom'
import NavbarEdition from './NavbarEdition'
import NavbarTableau from './NavbarTableau'
import './Navbar.scss'

export default function Navbar() {
  const location = useLocation()
  if (location.pathname.startsWith('/edition')) {
    return <NavbarEdition />
  }
  // Par défaut on affiche la navbar du tableau
  return <NavbarTableau />
}
