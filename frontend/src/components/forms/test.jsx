import PropTypes from 'prop-types'
import { Checkbox, Input, Select, ImagePreview } from '@/components'
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
            <div className="tache-edition__col image">
              <ImagePreview
                url={`http://localhost:3001${t.imagePath}`}
                alt={t.label}
                size="sm"
              />
              <Checkbox
                id={`aujourdhui-${t.id}`}
                checked={!!t.aujourdhui}
                onChange={() => onToggleAujourdhui(t.id, t.aujourdhui)}
                label=""
                aria-label="À faire"
                size="md"
              />
            </div>

            <div className="tache-edition__col info">
              <Input
                id={`label-${t.id}`}
                value={t.label}
                onChange={(e) => onUpdateLabel(t.id, e.target.value)}
                aria-label="Nom de la tâche"
                error=""
              />
              <div className="test-label">
                <Select
                  id={`categorie-${t.id}`}
                  value={t.categorie}
                  onChange={(e) => onUpdateCategorie(t.id, e.target.value)}
                  options={categories}
                  aria-label="Catégorie de la tâche"
                  error=""
                />
                <button
                  className="delete-btn"
                  onClick={() => onDelete(t)}
                  title="Supprimer la tâche"
                >
                  🗑️
                </button>
              </div>
            </div>
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
