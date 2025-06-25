import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { InputWithValidation, Select, Button, ImagePreview } from '@/components'
import { validateNotEmpty, noEdgeSpaces, noDoubleSpaces } from '@/utils'

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
  const [imageError, setImageError] = useState('')
  const confirmRef = useRef(null)

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const cleanLabel = label.trim().replace(/\s+/g, ' ')

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
    const validImage = image !== null
    if (!validImage) {
      setImageError('Choisis une image PNG, JPG ou SVG, légère (max. 500 Ko).')
    }

    if (label && validImage) {
      onSubmit({ label: cleanLabel, categorie, image })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="item-form">
      <InputWithValidation
        id="item-form-label"
        value={label}
        onValid={(val) => setLabel(val)}
        rules={[validateNotEmpty, noEdgeSpaces, noDoubleSpaces]}
        ariaLabel="Nom"
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

      <input
        id="item-form-image"
        type="file"
        className={`input-field__input ${imageError ? 'input-field__input--error' : ''}`}
        onChange={handleImage}
        aria-label="Image"
      />
      {imageError && (
        <div className="input-field__error-message">{imageError}</div>
      )}

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
