'use client'

// src/components/shared/modal/modal-image-upload/ImageUploadModal.tsx
// Modal complet pour upload d'image avec preview + progress + gestion erreurs

import { Modal, Button, ImagePreview, UploadProgress } from '@/components'
import { useI18n } from '@/hooks'
import { modernUploadImage, type UploadResult, type AssetType, type ProgressInfo } from '@/utils/storage/modernUploadImage'
import { useAuth } from '@/hooks'
import { useState, useRef, useCallback } from 'react'
import './ImageUploadModal.scss'

type ModalState = 'initial' | 'uploading' | 'success' | 'error'

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  assetType: AssetType
  onSuccess: (result: UploadResult) => void
  prefix?: string
}

export default function ImageUploadModal({
  isOpen,
  onClose,
  assetType,
  onSuccess,
  prefix = 'misc',
}: ImageUploadModalProps) {
  const { t } = useI18n()
  const { user } = useAuth()

  // États
  const [state, setState] = useState<ModalState>('initial')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState('validation')
  const [uploadMessage, setUploadMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Callback pour progress hook
  const handleProgress = useCallback((info: ProgressInfo) => {
    setUploadProgress(info.progress)
    setUploadStep(info.step)
    if (info.message) {
      setUploadMessage(info.message)
    }
  }, [])

  // Gestion sélection fichier
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation simple (le reste est fait dans modernUploadImage)
    if (!file.type.startsWith('image/')) {
      setError(t('edition.errorImageFormat') || 'Format invalide')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  // Réinitialiser le modal
  const resetModal = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadProgress(0)
    setUploadStep('validation')
    setUploadMessage('')
    setError(null)
    setUploadResult(null)
    setState('initial')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Fermer le modal
  const handleClose = () => {
    resetModal()
    onClose()
  }

  // Lancer l'upload
  const handleUpload = async () => {
    if (!selectedFile || !user?.id) {
      setError(t('edition.errorUser') || 'User not found')
      return
    }

    setState('uploading')
    setError(null)

    try {
      const result = await modernUploadImage(selectedFile, {
        userId: user.id,
        assetType,
        prefix,
        onProgress: handleProgress,
      })

      if (result.error) {
        throw result.error
      }

      setUploadResult(result)
      setState('success')
    } catch (err) {
      const errorMessage = (err as Error).message || t('edition.errorImageUpload') || 'Upload failed'
      setError(errorMessage)
      setState('error')
    }
  }

  // Confirmer l'upload réussi
  const handleConfirmSuccess = () => {
    if (uploadResult) {
      onSuccess(uploadResult)
      handleClose()
    }
  }

  // Retry après erreur
  const handleRetry = () => {
    resetModal()
    setState('initial')
  }

  // Rendu selon l'état
  const renderContent = () => {
    switch (state) {
      case 'initial':
        return (
          <div className="image-upload__container">
            <div className="image-upload__section">
              {previewUrl && (
                <div className="image-upload__preview">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="image-upload__preview-img"
                  />
                </div>
              )}

              <div className="image-upload__input-wrapper">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="image-upload__input"
                  aria-label={t('edition.selectImage') || 'Select image'}
                />
                <button
                  type="button"
                  className="image-upload__button-select"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl
                    ? t('edition.changeImage') || 'Change image'
                    : t('edition.selectImage') || 'Select image'}
                </button>
              </div>

              {error && (
                <div className="image-upload__error" role="alert">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </div>
        )

      case 'uploading':
        return (
          <div className="image-upload__container">
            <div className="image-upload__section image-upload__uploading">
              <UploadProgress
                progress={uploadProgress}
                message={uploadMessage}
                step={uploadStep as any}
              />
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="image-upload__container">
            <div className="image-upload__section image-upload__success">
              <div className="image-upload__success-icon">✅</div>
              <p className="image-upload__success-text">
                {t('edition.imageUploaded') || 'Image uploaded successfully!'}
              </p>
              {uploadResult?.isDuplicate && (
                <p className="image-upload__success-subtitle">
                  ♻️ {t('edition.imageDuplicate') || 'This image was already in your library'}
                </p>
              )}
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="image-upload__container">
            <div className="image-upload__section image-upload__error-state">
              <div className="image-upload__error-icon">❌</div>
              <p className="image-upload__error-title">
                {t('edition.uploadFailed') || 'Upload failed'}
              </p>
              <p className="image-upload__error-message">{error}</p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Actions du modal selon l'état
  const getActions = () => {
    switch (state) {
      case 'initial':
        return [
          {
            label: t('actions.cancel') || 'Cancel',
            onClick: handleClose,
            variant: 'secondary' as const,
          },
          {
            label: t('actions.upload') || 'Upload',
            onClick: handleUpload,
            variant: 'primary' as const,
            disabled: !selectedFile,
          },
        ]

      case 'uploading':
        return [] // Pas d'actions pendant l'upload

      case 'success':
        return [
          {
            label: t('actions.useImage') || 'Use this image',
            onClick: handleConfirmSuccess,
            variant: 'primary' as const,
          },
          {
            label: t('actions.selectAnother') || 'Select another',
            onClick: handleRetry,
            variant: 'secondary' as const,
          },
        ]

      case 'error':
        return [
          {
            label: t('actions.close') || 'Close',
            onClick: handleClose,
            variant: 'secondary' as const,
          },
          {
            label: t('actions.retry') || 'Retry',
            onClick: handleRetry,
            variant: 'primary' as const,
          },
        ]

      default:
        return []
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('edition.uploadImage') || 'Upload image'}
      actions={getActions()}
      size="small"
      closeOnOverlay={state === 'initial'} // Fermer au clic overlay seulement en mode initial
      closeOnEscape={state === 'initial'}
    >
      {renderContent()}
    </Modal>
  )
}
