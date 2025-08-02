import PropTypes from 'prop-types'
import { useState } from 'react'
import {
  Button,
  ModalAjout,
  EditionCard,
  EditionList,
  SignedImage,
} from '@/components'
import { useToast } from '@/contexts'
import './RecompensesEdition.scss'

export default function RecompensesEdition({
  items,
  onDelete,
  onToggleSelect,
  onLabelChange,
  onSubmitReward,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [errors, setErrors] = useState({})
  const [successIds, setSuccessIds] = useState(new Set())

  const { show } = useToast()

  const validateLabel = label => {
    const trimmed = label.trim()
    if (!trimmed || trimmed !== label || /\s{2,}/.test(label)) {
      return 'Nom invalide'
    }
    return ''
  }

  const handleChange = (id, value) => {
    setDrafts(prev => ({ ...prev, [id]: value }))
    setErrors(prev => ({ ...prev, [id]: '' }))
  }

  const handleBlur = (id, value) => {
    const error = validateLabel(value)
    if (error) {
      setErrors(prev => ({ ...prev, [id]: error }))
      return
    }

    onLabelChange(id, value)
    show('Récompense modifiée', 'success')

    setDrafts(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    setErrors(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    setSuccessIds(prev => new Set([...prev, id]))
    setTimeout(() => {
      setSuccessIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 600)
  }

  return (
    <div className="checklist-recompenses">
      <EditionList
        title="🎁 Choisir la récompense"
        items={items}
        emptyLabel="Aucune récompense"
        renderCard={r => (
          <EditionCard
            key={r.id}
            imageComponent={
              <SignedImage filePath={r.imagepath} alt={r.label} size={80} />
            }
            label={drafts[r.id] ?? r.label}
            labelId={r.id}
            onLabelChange={val => handleChange(r.id, val)}
            onBlur={val => handleBlur(r.id, val)}
            onDelete={() => onDelete(r)}
            checked={r.selected === true || r.selected === 1}
            onToggleCheck={() =>
              onToggleSelect(r.id, r.selected === true || r.selected === 1)
            }
            categorieOptions={[]} // masque le <Select />
            className={[
              r.selected === 1 ? 'active' : '',
              'card-reward',
              errors[r.id] ? 'input-field__input--error' : '',
              successIds.has(r.id) ? 'input-field__input--success' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        )}
      >
        <Button
          label="🏱 Ajouter une récompense"
          onClick={() => setModalOpen(true)}
        />
      </EditionList>

      <ModalAjout
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        includeCategory={false}
        onSubmit={values => {
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
