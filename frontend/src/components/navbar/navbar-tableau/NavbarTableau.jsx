import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import Modal from '@/components/modal/Modal'

export default function NavbarTableau() {
  const [showConfirm, setShowConfirm] = useState(false)

  const triggerReset = () => {
    window.dispatchEvent(new Event('resetTasks'))
    setShowConfirm(false)
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <NavLink
          to="/edition"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          Édition
        </NavLink>
      </div>
      <div className="navbar-actions">
        <button className="reset-button" onClick={() => setShowConfirm(true)}>
          Réinitialiser
        </button>
        <Modal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          actions={[
            { label: 'Annuler', onClick: () => setShowConfirm(false) },
            {
              label: 'Réinitialiser',
              onClick: triggerReset,
              variant: 'primary',
              autoFocus: true,
            },
          ]}
        >
          <p>❗ Es-tu sûr de vouloir tout réinitialiser ?</p>
        </Modal>
      </div>
    </nav>
  )
}
