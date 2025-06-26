import PropTypes from 'prop-types'
import CardEdition from '@/components/card-edition/CardEdition'
import { useState } from 'react'
import './TachesEdition.scss'

export default function ChecklistTachesEdition({
  items,
  categories,
  onToggleAujourdhui,
  onUpdateLabel,
  onUpdateCategorie,
  onDelete,
}) {
  const [errors, setErrors] = useState({})
  const [drafts, setDrafts] = useState({})
  const [successIds, setSuccessIds] = useState(new Set())

  const validateLabel = (label) => {
    const trimmed = label.trim()
    if (!trimmed || trimmed !== label || /\s{2,}/.test(label)) {
      return 'Nom invalide'
    }
    return ''
  }

  const handleChange = (id, value) => {
    setDrafts((prev) => ({ ...prev, [id]: value }))
    setErrors((prev) => ({ ...prev, [id]: '' }))
  }

  const handleBlur = (id, value) => {
    const error = validateLabel(value)

    if (error) {
      setErrors((prev) => ({ ...prev, [id]: error }))
      return
    }

    onUpdateLabel(id, value)

    setDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    setSuccessIds((prev) => new Set([...prev, id]))
    setTimeout(() => {
      setSuccessIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 600)
  }

  return (
    <div className="checklist-edition">
      {items.length === 0 && <p>Aucune tâche pour le moment.</p>}

      <div className="liste-taches-edition">
        {items.map((t) => (
          <CardEdition
            key={t.id}
            imageUrl={`http://localhost:3001${t.imagePath}`}
            labelId={t.id}
            label={drafts[t.id] ?? t.label}
            onLabelChange={(val) => handleChange(t.id, val)}
            onBlur={(val) => handleBlur(t.id, val)}
            error={errors[t.id]}
            onDelete={() => onDelete(t)}
            checked={!!t.aujourdhui}
            onToggle={() => onToggleAujourdhui(t.id, t.aujourdhui)}
            showCategorieSelect={true}
            categorie={t.categorie}
            onCategorieChange={(val) => onUpdateCategorie(t.id, val)}
            categorieOptions={categories}
            className={[
              t.aujourdhui ? 'active' : '',
              errors[t.id] ? 'input-field__input--error' : '',
              successIds.has(t.id) ? 'input-field__input--success' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
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
