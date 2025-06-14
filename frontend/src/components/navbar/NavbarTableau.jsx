import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import Modal from '@/components/modal/Modal'
import { useProgress } from '@/contexts/ProgressContext'

export default function NavbarTableau() {
  const [showConfirm, setShowConfirm] = useState(false)
  const { ligne, setLigne, done, total, onReset } = useProgress()

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

        <div className="toolbar">
          <div className="ligne-select">
            <label htmlFor="ligne">Ligne :</label>
            <select
              id="ligne"
              value={ligne}
              onChange={(e) => setLigne(e.target.value)}
            >
              <option value="1">Ligne 1</option>
              <option value="6">Ligne 6</option>
              <option value="12">Ligne 12</option>
            </select>
          </div>

          <p className="progression">
            Progression : {done} / {total} tâches
          </p>

          <>
            <button
              className="reset-button"
              onClick={() => setShowConfirm(true)}
            >
              Réinitialiser
            </button>

            <Modal
              isOpen={showConfirm}
              onClose={() => setShowConfirm(false)}
              actions={[
                { label: 'Annuler', onClick: () => setShowConfirm(false) },
                {
                  label: 'Réinitialiser',
                  onClick: () => {
                    setShowConfirm(false)
                    onReset()
                  },
                  variant: 'primary',
                  autoFocus: true,
                },
              ]}
            >
              <p>❗ Es-tu sûr de vouloir tout réinitialiser ?</p>
            </Modal>
          </>
        </div>
      </div>
      <div className="navbar-actions" />
    </nav>
  )
}
