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
  uploadCardImage,
  type UploadCardImageResult,
} from '@/utils/storage/uploadCardImage'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
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
  imagePath: string // Chemin uploadé dans Storage (ex: "{accountId}/cards/{cardId}.jpg")
  imageUrl?: string // URL signée (optionnel, si besoin d'affichage direct)
  cardId: string // ID carte généré client-side (UUID v4)
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
  const [uploadedCardId, setUploadedCardId] = useState<string | null>(null)

  // 🆕 Flag pour éviter cleanup après submit réussi
  const committedRef = useRef(false)

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

  // 🆕 Cleanup robuste : supprimer image orpheline si composant unmount sans submit
  useEffect(() => {
    return () => {
      // Cleanup seulement si image uploadée ET pas committed
      if (uploadedImagePath && !committedRef.current) {
        console.log(
          '🗑️ [ItemForm] Cleanup image orpheline (unmount sans commit):',
          uploadedImagePath
        )
        deleteImageIfAny(uploadedImagePath, 'personal-images').catch(err => {
          console.error('Erreur cleanup image:', err)
        })
      }

      // Revoke preview URL to free memory
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedImagePath]) // Re-run si uploadedImagePath change

  const cleanLabel = label.trim().replace(/\s+/g, ' ')

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setImage(null)
      // 🆕 Revoke previous preview URL to free memory
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setImageError('')
      setUploadedImagePath(null)
      setUploadedCardId(null)
      setIsUploading(false)
      return
    }

    // 🛡️ Validation du type de fichier
    const typeError = validateImageType(file)
    if (typeError) {
      setImage(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setImageError(typeError)
      setUploadedImagePath(null)
      setUploadedCardId(null)
      return
    }

    // 🛡️ Validation sécurisée de l'en-tête (protection contre les faux fichiers)
    const headerError = await validateImageHeader(file)
    if (headerError) {
      setImage(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setImageError(headerError)
      setUploadedImagePath(null)
      setUploadedCardId(null)
      return
    }

    // ✅ Fichier validé - afficher preview via URL.createObjectURL (pas sign)
    // Revoke previous URL first
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    setImageError('')
    setUploadedImagePath(null)
    setUploadedCardId(null)

    // 🆕 Déclencher l'upload automatiquement
    await handleAutoUpload(file)
  }

  // 🆕 Auto-upload quand fichier validé (cartes personnelles uniquement)
  const handleAutoUpload = async (file: File) => {
    if (!user?.id) {
      setImageError(t('edition.errorUser') || 'User not found')
      return
    }

    // 🆕 Générer cardId client-side (UUID v4)
    const cardId = crypto.randomUUID()
    setUploadedCardId(cardId)

    setIsUploading(true)
    setUploadProgress(0)
    setImageError('')

    try {
      // ✅ Étape 1 : Validation (0-20%)
      setUploadStep('validation')
      setUploadProgress(10)

      // ✅ Étape 2 : Compression/Conversion (20-50%)
      setUploadStep('compression')
      setUploadProgress(30)

      // ✅ Étape 3 : Upload (50-90%)
      setUploadStep('upload')
      setUploadProgress(60)

      // 🆕 Upload dédié cartes avec conversion JPEG + path strict
      const result: UploadCardImageResult = await uploadCardImage(file, {
        accountId: user.id,
        cardId,
      })

      if (result.error) {
        throw result.error
      }

      // ✅ Étape 4 : Finalisation (90-100%)
      setUploadProgress(95)
      setUploadStep('complete')
      setUploadProgress(100)

      // ✅ Upload réussi - sauvegarder le chemin
      setUploadedImagePath(result.path)
      setIsUploading(false)

      console.log('✅ [ItemForm] Upload carte réussi')
      console.log('   • Card ID:', cardId)
      console.log('   • Path:', result.path)
    } catch (error) {
      const errorMsg =
        (error as Error).message ||
        t('edition.errorImageUpload') ||
        'Upload failed'
      setImageError(errorMsg)
      setIsUploading(false)
      setUploadedImagePath(null)
      setUploadedCardId(null)

      console.error('❌ [ItemForm] Erreur upload carte:', error)
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

    // 🆕 Vérifier que l'upload est complété (uploadedImagePath + uploadedCardId existent)
    const uploadComplete = uploadedImagePath !== null && uploadedCardId !== null
    if (!uploadComplete) {
      setImageError(
        t('edition.uploadNotComplete') || 'Image upload not complete'
      )
      return
    }

    if (label && uploadComplete) {
      // 🆕 Marquer comme committed pour éviter cleanup
      committedRef.current = true

      onSubmit({
        label: cleanLabel,
        categorie,
        image: image!,
        imagePath: uploadedImagePath!, // Path Storage: {accountId}/cards/{cardId}.jpg
        imageUrl: uploadedImagePath, // Alias pour compatibilité
        cardId: uploadedCardId!, // 🆕 ID carte généré client-side
      })
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
