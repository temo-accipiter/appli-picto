import { useLocation } from 'react-router-dom'
import { NavbarEdition, NavbarTableau } from '@/components'
import './Navbar.scss'

export default function Navbar() {
  const location = useLocation()
  if (location.pathname.startsWith('/edition')) {
    return <NavbarEdition />
  }
  return <NavbarTableau />
}
