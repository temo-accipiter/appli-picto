/**
 * Composant : ChecklistRecompensesEdition
 *
 * Rôle :
 *   Affiche et gère la liste des récompenses pour l’édition dans une version contrôlée :
 *     - suppression d’une récompense
 *     - sélection/désélection de la récompense du jour
 *
 * Props :
 *   - items: Array<{ id: string|number, label: string, imagePath?: string, selected: boolean|number }>
 *   - onDelete(id: string|number): void                // callback pour supprimer une récompense
 *   - onToggleSelect(id: string|number, currentlySelected: boolean|number): void  // callback pour changer la sélection
 */

import PropTypes from 'prop-types'
import './ChecklistRecompensesEdition.scss'

export default function ChecklistRecompensesEdition({
  items,
  onDelete,
  onToggleSelect,
}) {
  return (
    <div className="checklist-recompenses">
      <h2>🎁 Choisir la récompense du jour</h2>
      <div className="liste-recompenses">
        {items.map((r) => (
          <div
            key={r.id}
            className={`recompense-item ${r.selected ? 'active' : ''}`}
          >
            <button
              className="recompense-delete-btn"
              onClick={() => onDelete(r)}
              title="Supprimer"
            >
              ✖
            </button>
            <span className="recompense-label">{r.label}</span>
            {r.imagePath && (
              <img
                src={`http://localhost:3001${r.imagePath}`}
                alt={r.label}
                className="recompense-icon"
              />
            )}
            <input
              type="checkbox"
              name="selectedRecompense"
              checked={r.selected === 1}
              onChange={() => onToggleSelect(r.id, r.selected === 1)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

ChecklistRecompensesEdition.propTypes = {
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
}
