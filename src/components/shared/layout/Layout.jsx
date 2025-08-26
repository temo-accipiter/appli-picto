import {
    CookieBanner,
    CookiePreferences,
    Footer,
    Navbar,
    PageTransition,
} from '@/components'
import { useLocation } from 'react-router-dom'
import './Layout.scss'

export default function Layout() {
  const location = useLocation()
  const showNavbarRoutes = ['/profil', '/edition', '/tableau']
  const showNavbar = showNavbarRoutes.includes(location.pathname)

  return (
    <div className="layout">
      <div className="layout-main">
        {showNavbar && <Navbar />}
        <main>
          <PageTransition />
        </main>
        <Footer />
        <CookieBanner />
        <CookiePreferences />
      </div>
    </div>
  )
}

// PropTypes pour le composant Layout
Layout.propTypes = {
  // Aucune prop pour ce composant
}
