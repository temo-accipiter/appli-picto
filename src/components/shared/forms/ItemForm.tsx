import { Button, ImagePreview, InputWithValidation, Select } from '@/components'
import { useI18n } from '@/hooks'
import {
  makeNoDoubleSpaces,
  makeNoEdgeSpaces,
  makeValidateImageHeader,
  makeValidateImagePresence,
  makeValidateImageType,
  makeValidateNotEmpty,
} from '@/utils'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { InputWithValidationRef } from '../input-with-validation/InputWithValidation'
import './ItemForm.scss'

interface CategoryOption {
  value: string | number
  label: string
}

interface ItemFormData {
  label: string
  categorie: string
  image: File
}

interface ItemFormProps {
  includeCategory?: boolean
  categories?: CategoryOption[]
  onSubmit: (data: ItemFormData) => void
}

export default function ItemForm({
  includeCategory = false,
  categories = [],
  onSubmit,
}: ItemFormProps) {
  const { t } = useI18n()
  const [label, setLabel] = useState('')
  const [categorie, setCategorie] = useState('none')
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')
  const confirmRef = useRef<HTMLButtonElement>(null)
  const labelRef = useRef<InputWithValidationRef>(null)

  // Créer les fonctions de validation i18n avec useMemo pour éviter les re-créations
  const validateNotEmpty = useMemo(() => makeValidateNotEmpty(t), [t])
  const noEdgeSpaces = useMemo(() => makeNoEdgeSpaces(t), [t])
  const noDoubleSpaces = useMemo(() => makeNoDoubleSpaces(t), [t])
  const validateImagePresence = useMemo(() => makeValidateImagePresence(t), [t])
  const validateImageType = useMemo(() => makeValidateImageType(t), [t])
  const validateImageHeader = useMemo(() => makeValidateImageHeader(t), [t])

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const cleanLabel = label.trim().replace(/\s+/g, ' ')

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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

    // ✅ Pas de compression ici - modernUploadImage() gère tout
    // (HEIC → JPEG → WebP ≤ 20 KB, 192×192px, SHA-256, déduplication)
    setImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    setImageError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
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
        ariaLabel={t('tasks.title')}
      />

      {includeCategory && (
        <Select
          id="item-form-categorie"
          label={t('categories.title')}
          options={[
            { value: 'none', label: t('categories.noCategories') },
            ...categories.filter(c => c.value !== 'none'),
          ]}
          value={categorie}
          onChange={e => setCategorie(e.target.value)}
        />
      )}

      <div className="file-input-wrapper">
        <label htmlFor="item-form-image" className="file-input-label">
          {t('actions.chooseFile')}
        </label>
        <input
          id="item-form-image"
          type="file"
          accept="image/*"
          className={`file-input ${imageError ? 'file-input--error' : ''}`}
          onChange={handleImage}
          aria-label={t('quota.images')}
        />
      </div>
      {imageError && (
        <div className="input-field__error-message message-erreur">
          {imageError}
        </div>
      )}

      <ImagePreview url={previewUrl || ''} alt={t('quota.images')} size="lg" />
      <Button type="submit" label={t('actions.add')} />
    </form>
  )
}
