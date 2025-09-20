import { Button, ImagePreview, InputWithValidation, Select } from '@/components'
import {
    compressImageIfNeeded,
    compressionErrorMessage,
    noDoubleSpaces,
    noEdgeSpaces,
    validateImageHeader,
    validateImagePresence,
    validateImageType,
    validateNotEmpty,
} from '@/utils'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import './ItemForm.scss'

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
  const labelRef = useRef(null)

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const cleanLabel = label.trim().replace(/\s+/g, ' ')

  const handleImage = async e => {
    const file = e.target.files[0]
    if (!file) {
      setImage(null)
      setPreviewUrl(null)
      setImageError('')
      return
    }

    // 🛡️ Validation du type de fichier
    const typeError = validateImageType(file)
    if (typeError) {
      setImage(null)
      setPreviewUrl(null)
      setImageError(typeError)
      return
    }

    // 🛡️ Validation sécurisée de l'en-tête (protection contre les faux fichiers)
    const headerError = await validateImageHeader(file)
    if (headerError) {
      setImage(null)
      setPreviewUrl(null)
      setImageError(headerError)
      return
    }

    // 🎯 Compression et optimisation automatique (50 Ko max, 256x256px, PNG)
    const compressed = await compressImageIfNeeded(file)
    if (!compressed) {
      setImage(null)
      setPreviewUrl(null)
      setImageError(compressionErrorMessage)
      return
    }

    // Le fichier compressé peut être JPEG ou PNG selon l'optimisation
    const timestamp = Date.now()
    const extension = compressed.type === 'image/jpeg' ? 'jpg' : 'png'
    const cleanName = `tache_${timestamp}.${extension}`

    const finalFile = new File([compressed], cleanName, {
      type: compressed.type, // 'image/jpeg' ou 'image/png'
      lastModified: compressed.lastModified,
    })

    setImage(finalFile)
    setPreviewUrl(URL.createObjectURL(finalFile))
    setImageError('')
  }

  const handleSubmit = e => {
    e.preventDefault()
    labelRef.current?.validateNow?.()

    const validImage = image !== null
    if (!validImage) {
      setImageError(validateImagePresence(image))
    }

    if (label && validImage) {
      onSubmit({ label: cleanLabel, categorie, image })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="item-form">
      <InputWithValidation
        ref={labelRef}
        id="item-form-label"
        value={label}
        onValid={val => setLabel(val)}
        rules={[validateNotEmpty, noEdgeSpaces, noDoubleSpaces]}
        ariaLabel="Nom"
      />

      {includeCategory && (
        <Select
          id="item-form-categorie"
          label="Catégorie"
          options={[
            { value: 'none', label: 'Pas de catégorie' },
            ...categories.filter(c => c.value !== 'none'),
          ]}
          value={categorie}
          onChange={e => setCategorie(e.target.value)}
        />
      )}

      <input
        id="item-form-image"
        type="file"
        accept="image/*"
        className={`input-field__input ${
          imageError ? 'input-field__input--error' : ''
        }`}
        onChange={handleImage}
        aria-label="Image"
      />
      {imageError && (
        <div className="input-field__error-message message-erreur">
          {imageError}
        </div>
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
