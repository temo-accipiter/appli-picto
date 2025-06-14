import React from 'react'
import LangSelect from '@/components/lang-select/LangSelect'
import ThemeToggle from '@/components/theme-toggle/ThemeToggle'
import './NavbarEdition.scss'

export default function NavbarEdition({
  onOpenTaskModal,
  onOpenRewardModal,
  onOpenManageCategories,
}) {
  const handleAddSelect = (e) => {
    const value = e.target.value

    switch (value) {
      case 'task':
        onOpenTaskModal?.()
        break
      case 'reward':
        onOpenRewardModal?.()
        break
      case 'categories':
        onOpenManageCategories?.()
        break
      default:
        break
    }

    // Reset selection to keep placeholder
    e.target.value = ''
  }

  return (
    <nav className="navbar-edition">
      <div className="navbar-edition__item">
        <LangSelect />
      </div>
      <div className="navbar-edition__item">
        <ThemeToggle />
      </div>
      <div className="navbar-edition__item">
        <select
          className="navbar-edition__select"
          defaultValue=""
          onChange={handleAddSelect}
          aria-label="Menu Ajout"
        >
          <option value="" disabled>
            Ajout
          </option>
          <option value="task">Ajouter une tâche</option>
          <option value="reward">Ajouter une récompense</option>
          <option value="categories">Gérer les catégories</option>
        </select>
      </div>
      <div className="navbar-edition__item">Personnalisation</div>
      <div className="navbar-edition__item">Filtre</div>
      <div className="navbar-edition__item">Récompense</div>
      <div className="navbar-edition__item">Réinitialiser</div>
      <div className="navbar-edition__item">Switch</div>
    </nav>
  )
}
