import { useLocation } from 'react-router-dom'
import {
  PageTransition,
  Navbar,
  CookieBanner,
  CookiePreferences,
  Footer,
} from '@/components'
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
