import { useState, useRef, useEffect } from 'react'
import './AddMenu.scss'

export default function AddMenu({
  onOpenTask,
  onOpenReward,
  onOpenCategories,
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (open && menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  const handle = (fn) => {
    fn?.()
    setOpen(false)
  }

  return (
    <div className="add-menu" ref={menuRef}>
      <button
        className="add-menu__button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="add-menu-list"
        aria-label="Menu Ajout"
      >
        Ajout
      </button>
      {open && (
        <ul id="add-menu-list" className="add-menu__list" role="menu">
          <li>
            <button role="menuitem" onClick={() => handle(onOpenTask)}>
              Ajouter une tâche
            </button>
          </li>
          <li>
            <button role="menuitem" onClick={() => handle(onOpenReward)}>
              Ajouter une récompense
            </button>
          </li>
          <li>
            <button role="menuitem" onClick={() => handle(onOpenCategories)}>
              Gérer les catégories
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
