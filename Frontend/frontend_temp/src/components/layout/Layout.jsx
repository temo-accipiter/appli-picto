/**
 * Composant : Layout
 *
 * Rôle :
 *   Enveloppe l’application avec :
 *     • la barre de navigation (Navbar)
 *     • la zone principale où s’affichent les pages via Outlet
 *
 * Hooks & composants utilisés :
 *   • Navbar          – composant de navigation global
 *   • Outlet (react-router-dom) – insertion des routes enfants
 *
 * Props :
 *   (aucune)
 */

import Navbar from '@/components/navbar/Navbar'
import PageTransition from '@/components/pageTransition/PageTransition'
import './Layout.scss'

export default function Layout() {
  return (
    <div className="layout">
      <div className="layout-main">
        <Navbar />
        <main>
          <PageTransition />
        </main>
      </div>
    </div>
  )
}
