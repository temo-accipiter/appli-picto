import PropTypes from 'prop-types'
import { useState } from 'react'
import CardRecompense from '@/components/card-recompense/CardRecompense'
import { Button, ModalAjout } from '@/components'
import './RecompensesEdition.scss'

export default function RecompensesEdition({
  items,
  onDelete,
  onToggleSelect,
  onLabelChange,
  onSubmitReward,
}) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="checklist-recompenses">
      <div className="recompenses-header">
        <h2>🎁 Choisir la récompense</h2>
        <Button
          label="🏱 Ajouter une récompense"
          onClick={() => setModalOpen(true)}
        />
      </div>

      <div className="liste-recompenses">
        {items.map((r) => (
          <CardRecompense
            key={r.id}
            image={`http://localhost:3001${r.imagePath}`}
            label={r.label}
            labelId={r.id}
            onLabelChange={(val) => onLabelChange(r.id, val)}
            onBlur={(val) => onLabelChange(r.id, val)}
            onDelete={() => onDelete(r)}
            checked={r.selected === 1}
            onToggleCheck={() => onToggleSelect(r.id, r.selected === 1)}
          />
        ))}
      </div>

      <ModalAjout
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        includeCategory={false}
        onSubmit={(values) => {
          onSubmitReward(values)
          setModalOpen(false)
        }}
      />
    </div>
  )
}

RecompensesEdition.propTypes = {
  items: PropTypes.array.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleSelect: PropTypes.func.isRequired,
  onLabelChange: PropTypes.func.isRequired,
  onSubmitReward: PropTypes.func.isRequired,
}
