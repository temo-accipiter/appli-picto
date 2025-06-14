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
      >
        Ajout
      </button>
      {open && (
        <ul className="add-menu__list">
          <li>
            <button onClick={() => handle(onOpenTask)}>
              Ajouter une tâche
            </button>
          </li>
          <li>
            <button onClick={() => handle(onOpenReward)}>
              Ajouter une récompense
            </button>
          </li>
          <li>
            <button onClick={() => handle(onOpenCategories)}>
              Gérer les catégories
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
