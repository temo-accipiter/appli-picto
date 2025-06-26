/**
 *   Affiche et gère la liste des récompenses pour l’édition dans une version contrôlée :
 *     - suppression d’une récompense
 *     - sélection/désélection de la récompense du jour
 *
 */
import PropTypes from 'prop-types'
import { Checkbox, ImagePreview, ButtonClose } from '@/components'

import './RecompensesEdition.scss'

export default function RecompensesEdition({
  items,
  onDelete,
  onToggleSelect,
}) {
  return (
    <div className="checklist-recompenses">
      <h2>🎁 Choisir la récompense</h2>
      <div className="liste-recompenses">
        {items.map((r) => (
          <div
            key={r.id}
            className={`recompense-item ${r.selected ? 'active' : ''}`}
          >
            <span className="recompense-label">{r.label}</span>
            {r.imagePath && (
              <ImagePreview
                url={`http://localhost:3001${r.imagePath}`}
                alt={r.label}
                size="sm"
                className="recompense-icon"
              />
            )}
            <div className="card-footer">
              <Checkbox
                id={`recompense-${r.id}`}
                checked={r.selected === 1}
                onChange={() => onToggleSelect(r.id, r.selected === 1)}
                label=""
                aria-label={`Récompense sélectionnée : ${r.label}`}
                size="sm"
              />
              <ButtonClose onClick={() => onDelete(r)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

RecompensesEdition.propTypes = {
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
