/**
 * Composant : SelectedRecompense
 *
 * Rôle :
 *   Affiche la récompense actuellement sélectionnée.
 *   • Affichée uniquement si une récompense existe.
 *   • Indique si la récompense est débloquée (toutes les tâches terminées).
 *   • Permet de confirmer la sélection en cliquant lorsque déverrouillée.
 *
 * Props :
 *   - recompense: {
 *       id: number,
 *       label: string,
 *       imagePath?: string,
 *       selected?: number
 *     }              // objet récompense à afficher
 *   - done: number   // nombre de tâches accomplies
 *   - total: number  // nombre total de tâches
 *   - onSelect(id: number): void  // callback déclenché au clic si déverrouillé
 */

import PropTypes from 'prop-types'
import './SelectedRecompense.scss'

export default function SelectedRecompense({
  recompense,
  done,
  total,
  onSelect,
  small = false,
}) {
  if (!recompense) return null

  const isUnlocked = total > 0 && done === total

  return (
    <div
      className={`selected-recompense ${
        isUnlocked ? 'unlocked' : 'locked'
      } ${small ? 'small' : ''}`}
      onClick={() => isUnlocked && onSelect(recompense.id)}
    >
      <span className="label">{recompense.label}</span>
      {recompense.imagePath && (
        <img
          className="icon"
          src={`http://localhost:3001${recompense.imagePath}`}
          alt={recompense.label}
        />
      )}
    </div>
  )
}

SelectedRecompense.propTypes = {
  recompense: PropTypes.shape({
    id: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    imagePath: PropTypes.string,
    selected: PropTypes.number,
  }),
  done: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  small: PropTypes.bool,
}
