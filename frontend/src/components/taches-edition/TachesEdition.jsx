/**
 * Composant : ChecklistTachesEdition
 *
 * Rôle :
 *   Affiche une liste de tâches modifiables :
 *   – éditer le label
 *   – changer la catégorie
 *   – basculer « aujourd’hui »
 *   – supprimer
 *
 * Props :
 *   - items: Array<{
 *       id: string|number,
 *       label: string,
 *       categorie: string,
 *       aujourdhui: boolean|number,
 *       imagePath?: string
 *     }>
 *   - onToggleAujourdhui(id, current): fn
 *   - onUpdateLabel(id, newLabel): fn
 *   - onUpdateCategorie(id, newCat): fn
 *   - onDelete(item): fn
 */
import PropTypes from 'prop-types'
import { Checkbox, Select } from '@/components'
import './TachesEdition.scss'

export default function ChecklistTachesEdition({
  items,
  categories,
  onToggleAujourdhui,
  onUpdateLabel,
  onUpdateCategorie,
  onDelete,
}) {
  return (
    <div className="checklist-edition">
      {items.length === 0 && <p>Aucune tâche pour le moment.</p>}

      <div className="liste-taches-edition">
        {items.map((t) => (
          <div
            key={t.id}
            className={`tache-edition ${t.aujourdhui ? 'active' : ''}`}
          >
            {t.imagePath && (
              <img
                src={`http://localhost:3001${t.imagePath}`}
                alt={t.label}
                className="tache-icon"
              />
            )}

            <input
              type="text"
              name="label"
              value={t.label}
              onChange={(e) => onUpdateLabel(t.id, e.target.value)}
              className="editable-label"
            />

            <Select
              id={`categorie-${t.id}`}
              name="categorie"
              value={t.categorie}
              onChange={(e) => onUpdateCategorie(t.id, e.target.value)}
              options={categories}
            />

            <Checkbox
              id={`aujourdhui-${t.id}`}
              checked={!!t.aujourdhui}
              onChange={() => onToggleAujourdhui(t.id, t.aujourdhui)}
              label="" // pas de label visuel dans la liste
              aria-label="Marquer la tâche comme faite aujourd’hui"
            />

            <button
              className="delete-btn"
              onClick={() => onDelete(t)}
              title="Supprimer la tâche"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

ChecklistTachesEdition.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      categorie: PropTypes.string,
      aujourdhui: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
      imagePath: PropTypes.string,
    })
  ).isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  onToggleAujourdhui: PropTypes.func.isRequired,
  onUpdateLabel: PropTypes.func.isRequired,
  onUpdateCategorie: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}
