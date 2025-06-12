import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import Input from '@/components/fields/input/Input'
import Select from '@/components/fields/select/Select'
import './ItemForm.scss'

const MAX_SIZE = 500 * 1024
const VALID_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']

export default function ItemForm({
  includeCategory = false,
  categories = [],
  onSubmit,
}) {
  const [label, setLabel] = useState('')
  // Initialisation sur 'none' pour la catégorie par défaut
  const [categorie, setCategorie] = useState('none')
  const [image, setImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')
  const confirmRef = useRef(null)

  // Autofocus sur "Ajouter"
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const cleanLabel = label.trim().replace(/\s+/g, ' ')
  const isLabelValid = cleanLabel.length > 0 && cleanLabel === label

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) {
      setImage(null)
      setPreviewUrl(null)
      setError('')
      return
    }
    if (!VALID_TYPES.includes(file.type)) {
      setError('Format non supporté (PNG, JPG ou SVG).')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Image trop lourde (max 500 Ko).')
      return
    }
    setError('')
    setImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isLabelValid) {
      setError(
        'Le nom doit être non vide,\nsans espaces en début/fin ni doubles espaces.'
      )
      return
    }
    if (!image) {
      setError('Merci de choisir une image valide (≤ 500 Ko).')
      return
    }
    setError('')
    onSubmit({ label: cleanLabel, categorie, image })
  }

  return (
    <form onSubmit={handleSubmit} className="item-form">
      <Input
        id="item-form-label"
        label="Nom"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        error={!isLabelValid ? error : ''}
      />

      {includeCategory && (
        <Select
          id="item-form-categorie"
          label="Catégorie"
          options={[
            { value: 'none', label: 'Pas de catégorie' },
            ...categories.filter((c) => c.value !== 'none'),
          ]}
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          error="" // plus de champ requis
        />
      )}

      <Input
        id="item-form-image"
        label="Image (PNG, JPG, SVG ≤ 500 Ko)"
        type="file"
        onChange={handleImage}
        error={!image ? error : ''}
      />

      {previewUrl && (
        <div className="item-form__image-preview">
          <img src={previewUrl} alt="Aperçu de l’élément" />
        </div>
      )}

      <button ref={confirmRef} type="submit" className="btn btn--primary">
        Ajouter
      </button>
    </form>
  )
}

ItemForm.propTypes = {
  includeCategory: PropTypes.bool,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  onSubmit: PropTypes.func.isRequired,
}
