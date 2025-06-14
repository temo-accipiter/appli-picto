import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import LangSelector from '@/components/lang-selector/LangSelector'
import ThemeToggle from '@/components/theme-toggle/ThemeToggle'
import Button from '@/components/button/Button'
import Select from '@/components/fields/select/Select'
import Checkbox from '@/components/fields/checkbox/Checkbox'
import './EditionNavbar.scss'

export default function EditionNavbar({
  categories,
  filterCategory,
  setFilterCategory,
  filterDone,
  setFilterDone,
  confettis,
  setConfettis,
  onAddTask,
  onAddReward,
  onManageCategories,
  onChooseReward,
  onReset,
}) {
  const [openAjout, setOpenAjout] = useState(false)
  const [openPerso, setOpenPerso] = useState(false)
  const [openFiltre, setOpenFiltre] = useState(false)

  const closeAll = () => {
    setOpenAjout(false)
    setOpenPerso(false)
    setOpenFiltre(false)
  }

  return (
    <div className="edition-navbar">
      <LangSelector />
      <ThemeToggle />

      <div className="dropdown">
        <button
          className="dropdown-toggle"
          onClick={() => setOpenAjout((o) => !o)}
        >
          Ajout
        </button>
        {openAjout && (
          <div className="dropdown-menu">
            <Button
              label="Ajouter une tâche"
              variant="primary"
              onClick={() => {
                onAddTask()
                closeAll()
              }}
            />
            <Button
              label="Ajouter une récompense"
              variant="primary"
              onClick={() => {
                onAddReward()
                closeAll()
              }}
            />
            <Button
              label="Gérer les catégories"
              variant="secondary"
              onClick={() => {
                onManageCategories()
                closeAll()
              }}
            />
          </div>
        )}
      </div>

      <div className="dropdown">
        <button
          className="dropdown-toggle"
          onClick={() => setOpenPerso((o) => !o)}
        >
          Personnalisation
        </button>
        {openPerso && (
          <div className="dropdown-menu">
            <Checkbox
              id="confettis"
              className="confettis-checkbox"
              label={
                confettis ? '🎉 Confettis activés' : '🎊 Confettis désactivés'
              }
              checked={confettis}
              onChange={(e) => setConfettis(e.target.checked)}
            />
          </div>
        )}
      </div>

      <div className="dropdown">
        <button
          className="dropdown-toggle"
          onClick={() => setOpenFiltre((o) => !o)}
        >
          Filtre
        </button>
        {openFiltre && (
          <div className="dropdown-menu">
            <Select
              id="filter-category"
              label="Filtrer par catégorie"
              options={[{ value: 'all', label: 'Toutes' }, ...categories]}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            />
            <Checkbox
              id="filter-done"
              label="Tâches cochées seulement"
              checked={filterDone}
              onChange={(e) => setFilterDone(e.target.checked)}
            />
          </div>
        )}
      </div>

      <Button label="Récompense" variant="primary" onClick={onChooseReward} />
      <Button label="Réinitialiser" variant="reset" onClick={onReset} />
      <NavLink to="/" className="nav-switch">
        Tableau
      </NavLink>
    </div>
  )
}
