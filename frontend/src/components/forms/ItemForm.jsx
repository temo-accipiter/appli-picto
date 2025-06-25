import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Input, Select, Button, ImagePreview } from '@/components'
import './ItemForm.scss'

const MAX_SIZE = 500 * 1024
const VALID_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']

export default function ItemForm({
  includeCategory = false,
  categories = [],
  onSubmit,
}) {
  const [label, setLabel] = useState('')
  const [categorie, setCategorie] = useState('none')
  const [image, setImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const [labelError, setLabelError] = useState('')
  const [imageError, setImageError] = useState('')
  const [labelSuccess, setLabelSuccess] = useState(false)

  const confirmRef = useRef(null)

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const cleanLabel = label.trim().replace(/\s+/g, ' ')

  const validateLabel = (str) => {
    const trimmed = str.trim()
    if (!trimmed || trimmed !== str || /\s{2,}/.test(str)) {
      return 'Le nom ne peut pas être vide, commencer/terminer par un espace, ou contenir des doubles espaces.'
    }
    return ''
  }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) {
      setImage(null)
      setPreviewUrl(null)
      setImageError('')
      return
    }
    if (!VALID_TYPES.includes(file.type)) {
      setImageError('Format non supporté. (PNG, JPG ou SVG)')
      return
    }
    if (file.size > MAX_SIZE) {
      setImageError('Image trop lourde (max. 500 Ko).')
      return
    }
    setImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    setImageError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const labelValidation = validateLabel(label)
    const validLabel = labelValidation === ''
    const validImage = image !== null

    if (!validLabel) {
      setLabelError(labelValidation)
    } else {
      setLabelError('')
      setLabelSuccess(true)
      setTimeout(() => setLabelSuccess(false), 600)
    }

    if (!validImage) {
      setImageError('Choisis une image PNG, JPG ou SVG, légère (max. 500 Ko).')
    }

    if (validLabel && validImage) {
      onSubmit({ label: cleanLabel, categorie, image })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="item-form">
      <Input
        id="item-form-label"
        label="Nom"
        value={label}
        onChange={(e) => {
          setLabel(e.target.value)
          if (labelError) setLabelError('')
        }}
        error={labelError}
        className={
          labelError
            ? 'input-field__input--error'
            : labelSuccess
              ? 'input-field__input--success'
              : ''
        }
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
        />
      )}

      <Input
        id="item-form-image"
        label="Image (PNG, JPG, SVG ≤ 500 Ko)"
        type="file"
        onChange={handleImage}
        error={imageError}
        className={imageError ? 'input-field__input--error' : ''}
      />

      <ImagePreview url={previewUrl} alt="Aperçu de l’image" size="lg" />

      <Button ref={confirmRef} type="submit" label="Ajouter" />
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
