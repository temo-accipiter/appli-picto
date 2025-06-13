import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import './DropdownAjout.scss'

export default function DropdownAjout({
  setModalTacheOpen,
  setModalRecompenseOpen,
  setManageCatOpen,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Ferme le menu au clic à l'extérieur
  useEffect(() => {
    const handleClick = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Ferme avec Esc
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const openTache = () => {
    setModalTacheOpen(true)
    setOpen(false)
  }

  const openRecompense = () => {
    setModalRecompenseOpen(true)
    setOpen(false)
  }

  const openManageCat = () => {
    setManageCatOpen(true)
    setOpen(false)
  }

  return (
    <div className="dropdown-ajout" ref={ref}>
      <button
        className="dropdown-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Ajout
      </button>

      {open && (
        <div className="dropdown-menu" role="menu">
          <button className="menu-item" onClick={openTache} role="menuitem">
            Ajouter une tâche
          </button>
          <button
            className="menu-item"
            onClick={openRecompense}
            role="menuitem"
          >
            Ajouter une récompense
          </button>
          <button className="menu-item" onClick={openManageCat} role="menuitem">
            Gérer catégorie
          </button>
        </div>
      )}
    </div>
  )
}

DropdownAjout.propTypes = {
  setModalTacheOpen: PropTypes.func.isRequired,
  setModalRecompenseOpen: PropTypes.func.isRequired,
  setManageCatOpen: PropTypes.func.isRequired,
}
