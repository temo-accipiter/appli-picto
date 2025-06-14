import React from 'react'
import LangSelect from '@/components/lang-select/LangSelect'
import ThemeToggle from '@/components/theme-toggle/ThemeToggle'
import './NavbarEdition.scss'

export default function NavbarEdition() {
  return (
    <nav className="navbar-edition">
      <div className="navbar-edition__item">
        <LangSelect />
      </div>
      <div className="navbar-edition__item">
        <ThemeToggle />
      </div>
      <div className="navbar-edition__item">Ajout</div>
      <div className="navbar-edition__item">Personnalisation</div>
      <div className="navbar-edition__item">Filtre</div>
      <div className="navbar-edition__item">Récompense</div>
      <div className="navbar-edition__item">Réinitialiser</div>
      <div className="navbar-edition__item">Switch</div>
    </nav>
  )
}
