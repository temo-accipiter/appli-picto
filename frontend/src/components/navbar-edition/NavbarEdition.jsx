import React from 'react'
import './NavbarEdition.scss'

export default function NavbarEdition() {
  return (
    <nav className="navbar-edition">
      <div className="navbar-edition__item">Langue</div>
      <div className="navbar-edition__item">Thème</div>
      <div className="navbar-edition__item">Ajout</div>
      <div className="navbar-edition__item">Personnalisation</div>
      <div className="navbar-edition__item">Filtre</div>
      <div className="navbar-edition__item">Récompense</div>
      <div className="navbar-edition__item">Réinitialiser</div>
      <div className="navbar-edition__item">Switch</div>
    </nav>
  )
}
