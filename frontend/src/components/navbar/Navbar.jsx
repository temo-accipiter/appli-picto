import { useLocation } from 'react-router-dom'
import NavbarEdition from './NavbarEdition'
import NavbarTableau from './NavbarTableau'
import './Navbar.scss'

export default function Navbar() {
  const { pathname } = useLocation()
  return pathname.startsWith('/edition') ? <NavbarEdition /> : <NavbarTableau />
}
