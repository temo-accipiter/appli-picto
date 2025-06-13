import PropTypes from 'prop-types'
import Modal from '@/components/modal/Modal'
import './ModalRecompensesChoix.scss'

export default function ModalRecompensesChoix({
  isOpen = true,
  items,
  onDelete,
  onToggleSelect,
  onClose,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choisir une récompense"
      actions={[{ label: 'Fermer', onClick: onClose }]}
    >
      <div className="modal-recompenses-choix">
        {items.map((r) => (
          <div
            key={r.id}
            className={`recompense-card ${r.selected ? 'active' : ''}`}
          >
            <button
              className="card-delete-btn"
              onClick={() => onDelete(r)}
              title="Supprimer"
            >
              ✖
            </button>
            <span className="card-label">{r.label}</span>
            {r.imagePath && (
              <img
                src={`http://localhost:3001${r.imagePath}`}
                alt={r.label}
                className="card-icon"
              />
            )}
            <input
              type="checkbox"
              checked={r.selected === 1}
              onChange={() => onToggleSelect(r.id, r.selected === 1)}
            />
          </div>
        ))}
      </div>
    </Modal>
  )
}

ModalRecompensesChoix.propTypes = {
  isOpen: PropTypes.bool,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      imagePath: PropTypes.string,
      selected: PropTypes.oneOfType([PropTypes.bool, PropTypes.number])
        .isRequired,
    })
  ).isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}
