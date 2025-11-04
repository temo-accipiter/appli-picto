import {
  Button,
  EditionCard,
  EditionList,
  ModalAjout,
  SignedImage,
} from '@/components'
import { useI18n } from '@/hooks'
import PropTypes from 'prop-types'
import { useState } from 'react'
import './RecompensesEdition.scss'

export default function RecompensesEdition({
  items,
  onDelete,
  onToggleSelect,
  onLabelChange,
  onSubmitReward,
  onShowQuotaModal,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [errors, setErrors] = useState({})
  const [successIds, setSuccessIds] = useState(new Set())

  const { t } = useI18n()

  const validateLabel = label => {
    const trimmed = label.trim()
    if (!trimmed || trimmed !== label || /\s{2,}/.test(label)) {
      return t('rewards.invalidName')
    }
    return ''
  }

  const handleChange = (id, value) => {
    setDrafts(prev => ({ ...prev, [id]: value }))
    setErrors(prev => ({ ...prev, [id]: '' }))
  }

  const handleBlur = async (id, value) => {
    const error = validateLabel(value)
    if (error) {
      setErrors(prev => ({ ...prev, [id]: error }))
      return
    }

    // Attendre le résultat de la mise à jour
    const result = await onLabelChange(id, value)

    // Le toast est déjà géré dans le hook useRecompenses.updateLabel
    // On ne fait que gérer l'état local du composant

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

    // Afficher l'indicateur de succès seulement si pas d'erreur
    if (!result?.error) {
      setSuccessIds(prev => new Set([...prev, id]))
      setTimeout(() => {
        setSuccessIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 600)
    }
  }

  return (
    <div className="checklist-recompenses">
      <EditionList
        title={`🎁 ${t('rewards.toEdit')}`}
        items={items}
        emptyLabel={t('rewards.noRewardsToDisplay')}
        renderCard={r => (
          <EditionCard
            key={r.id}
            imageComponent={
              <SignedImage
                filePath={r.imagepath}
                bucket="images"
                alt={r.label}
                className="img-size-sm"
              />
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
          label={`🏱 ${t('rewards.addReward')}`}
          onClick={async () => {
            if (onShowQuotaModal) {
              const canOpen = await onShowQuotaModal('reward')
              if (canOpen) {
                setModalOpen(true)
              }
            } else {
              setModalOpen(true)
            }
          }}
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
  onShowQuotaModal: PropTypes.func,
}
