'use client'

import {
  Button,
  ImagePreview,
  InputWithValidation,
  Select,
  UploadProgress,
  type UploadStep,
} from '@/components'
import { useI18n } from '@/hooks'
import { useAuth } from '@/hooks'
import {
  modernUploadImage,
  type AssetType,
  type ProgressInfo,
} from '@/utils/storage/modernUploadImage'
import {
  makeNoDoubleSpaces,
  makeNoEdgeSpaces,
  makeValidateImageHeader,
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
  assetType?: AssetType // Pour upload (task_image ou reward_image)
  prefix?: string // Pour chemin upload (taches ou recompenses)
}

export default function ItemForm({
  includeCategory = false,
  categories = [],
  onSubmit,
  assetType = 'task_image',
  prefix = 'misc',
}: ItemFormProps) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [label, setLabel] = useState('')
  const [categorie, setCategorie] = useState('none')
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')

  // 🆕 States pour upload
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState<UploadStep>('validation')
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(
    null
  )

  const confirmRef = useRef<HTMLButtonElement>(null)
  const labelRef = useRef<InputWithValidationRef>(null)

  // Créer les fonctions de validation i18n avec useMemo pour éviter les re-créations
  const validateNotEmpty = useMemo(() => makeValidateNotEmpty(t), [t])
  const noEdgeSpaces = useMemo(() => makeNoEdgeSpaces(t), [t])
  const noDoubleSpaces = useMemo(() => makeNoDoubleSpaces(t), [t])
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
      setUploadedImagePath(null)
      setIsUploading(false)
      return
    }

    // 🛡️ Validation du type de fichier
    const typeError = validateImageType(file)
    if (typeError) {
      setImage(null)
      setPreviewUrl(null)
      setImageError(typeError)
      setUploadedImagePath(null)
      return
    }

    // 🛡️ Validation sécurisée de l'en-tête (protection contre les faux fichiers)
    const headerError = await validateImageHeader(file)
    if (headerError) {
      setImage(null)
      setPreviewUrl(null)
      setImageError(headerError)
      setUploadedImagePath(null)
      return
    }

    // ✅ Fichier validé - afficher preview et LANCER UPLOAD AUTOMATIQUEMENT
    setImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    setImageError('')
    setUploadedImagePath(null)

    // 🆕 Déclencher l'upload automatiquement
    await handleAutoUpload(file)
  }

  // 🆕 Auto-upload quand fichier validé
  const handleAutoUpload = async (file: File) => {
    if (!user?.id) {
      setImageError(t('edition.errorUser') || 'User not found')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setImageError('')

    try {
      const result = await modernUploadImage(file, {
        userId: user.id,
        assetType,
        prefix,
        onProgress: (info: ProgressInfo) => {
          setUploadProgress(info.progress)
          setUploadStep(info.step as UploadStep)
        },
      })

      if (result.error) {
        throw result.error
      }

      // ✅ Upload réussi - sauvegarder le chemin
      setUploadedImagePath(result.path)
      setIsUploading(false)
    } catch (error) {
      const errorMsg =
        (error as Error).message ||
        t('edition.errorImageUpload') ||
        'Upload failed'
      setImageError(errorMsg)
      setIsUploading(false)
      setUploadedImagePath(null)
    }
  }

  // 🆕 Retry upload
  const handleRetryUpload = async () => {
    if (image) {
      await handleAutoUpload(image)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    labelRef.current?.validateNow?.()

    // 🆕 Vérifier que l'upload est complété (uploadedImagePath existe)
    const uploadComplete = uploadedImagePath !== null
    if (!uploadComplete) {
      setImageError(
        t('edition.uploadNotComplete') || 'Image upload not complete'
      )
      return
    }

    if (label && uploadComplete) {
      onSubmit({ label: cleanLabel, categorie, image: image! })
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
      {/* 🆕 Afficher progress bar si en cours d'upload */}
      {isUploading && (
        <div className="item-form__progress-section">
          <UploadProgress progress={uploadProgress} step={uploadStep} />
        </div>
      )}

      {/* Afficher preview et erreurs si pas en upload */}
      {!isUploading && previewUrl && (
        <>
          <ImagePreview url={previewUrl} alt={t('quota.images')} size="lg" />

          {uploadedImagePath && (
            <div
              className="item-form__success"
              role="status"
              aria-live="polite"
            >
              ✅ {t('edition.imageUploaded') || 'Image uploaded successfully'}
            </div>
          )}
        </>
      )}

      {imageError && (
        <div className="item-form__error-section">
          <div className="input-field__error-message message-erreur">
            {imageError}
          </div>
          {/* Bouton retry si erreur upload */}
          {image && !uploadedImagePath && !isUploading && (
            <Button
              type="button"
              label={t('actions.retry') || 'Retry'}
              onClick={handleRetryUpload}
              variant="secondary"
            />
          )}
        </div>
      )}

      <Button
        type="submit"
        label={t('actions.add') || 'Add'}
        disabled={!uploadedImagePath || isUploading}
      />
    </form>
  )
}
