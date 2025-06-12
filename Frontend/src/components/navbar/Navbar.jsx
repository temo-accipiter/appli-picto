/**
 * Composant : Navbar
 *
 * Rôle :
 *   Barre de navigation principale de l’application, affichée en haut.
 *   • Liens vers les pages : Tableau, Édition, Paramètres.
 *   • Indique la page active avec un style “active”.
 *   • Composants actions : sélecteur de langue, switch thème.
 *
 * Bibliothèques & composants utilisés :
 *   • NavLink (react-router-dom) – liens de navigation avec état actif
 *   • icônes Lucide React (Home, Edit3, Settings)
 *   • ThemeToggle – bouton pour changer de thème clair/sombre
 *   • LangSelector – sélection de la langue
 *
 * Props :
 *   (aucune)
 */

import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Edit3, Settings } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle/ThemeToggle'
import LangSelector from '@/components/lang-selector/LangSelector'
import './Navbar.scss'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          <Home size={20} /> Tableau
        </NavLink>
        <NavLink
          to="/edition"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          <Edit3 size={20} /> Édition
        </NavLink>
      </div>

      <div className="navbar-actions">
        <LangSelector />
        <ThemeToggle />
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          <Settings size={20} />
        </NavLink>
      </div>
    </nav>
  )
}
