'use client'

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type DragEvent,
  type ChangeEvent,
} from 'react'
import Modal from '@/components/shared/modal/Modal'
import { Button, Select, Toggle } from '@/components'
import { useAdminBankCards, useAuth } from '@/hooks'
import { useToast } from '@/contexts'
import { uploadBankCardImage } from '@/utils/storage/uploadBankCardImage'
import { uploadCardImage } from '@/utils/storage/uploadCardImage'
import { compressImageIfNeeded } from '@/utils/validationRules'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
import formatErr from '@/utils/logs/formatErr'
import type { Categorie } from '@/types/global'
import type { ItemFormData } from '@/components/shared/forms/ItemForm'
import './CreateCardModal.scss'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ImageInfo {
  filename: string
  sizeKo: number
  width: number
  height: number
}

export interface CreateCardModalProps {
  /** 'bank' : carte banque (admin) — 'personal' : carte personnelle */
  variant: 'bank' | 'personal'
  onClose: () => void
  overlayClassName?: string
  /** Bank cards : appelé après création réussie */
  onSuccess?: () => void
  /** Personal cards : appelé avec les données complètes (image déjà uploadée) */
  onSubmit?: (data: ItemFormData) => void
  /** Personal cards uniquement */
  categories?: Categorie[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateCardModal({
  variant,
  onClose,
  overlayClassName,
  onSuccess,
  onSubmit,
  categories = [],
}: CreateCardModalProps) {
  const { show: showToast } = useToast()
  const { createCard: createBankCard } = useAdminBankCards()
  const { user } = useAuth()

  // ── Formulaire ──────────────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [categorie, setCategorie] = useState('none')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null)
  const [imageError, setImageError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [published, setPublished] = useState(false)

  // ── Upload ──────────────────────────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  // Personal cards : chemin Storage après auto-upload
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(
    null
  )
  const [uploadedCardId, setUploadedCardId] = useState<string | null>(null)

  // Évite le cleanup Storage si le submit a réussi (personal only)
  const committedRef = useRef(false)

  // Ref pour déclencher l'input file natif
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Cleanup auto-upload sur unmount (personal) ─────────────────────────────
  useEffect(() => {
    return () => {
      if (
        variant === 'personal' &&
        uploadedImagePath &&
        !committedRef.current
      ) {
        deleteImageIfAny(uploadedImagePath, 'personal-images').catch(err => {
          console.error('[CreateCardModal] Cleanup image orpheline:', err)
        })
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedImagePath])

  // ── Validation formulaire ──────────────────────────────────────────────────
  const isValid =
    name.trim() !== '' &&
    imageFile !== null &&
    !isUploading &&
    !imageError &&
    (variant === 'bank' || uploadedImagePath !== null)

  // ── Lecture dimensions image ───────────────────────────────────────────────
  const readImageInfo = useCallback((file: File, url: string) => {
    const img = new Image()
    img.onload = () => {
      setImageInfo({
        filename: file.name,
        sizeKo: Math.round(file.size / 1024),
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.src = url
  }, [])

  // ── Traitement fichier sélectionné ─────────────────────────────────────────
  const processFile = useCallback(
    async (file: File) => {
      // Réinitialiser états précédents
      setImageError('')
      setUploadedImagePath(null)
      setUploadedCardId(null)

      if (!file.type.startsWith('image/')) {
        setImageError('Le fichier sélectionné doit être une image.')
        return
      }

      if (variant === 'bank') {
        // Bank : compression immédiate, upload différé au submit
        try {
          const compressed = await compressImageIfNeeded(file)
          if (!compressed) {
            setImageError("Impossible de traiter l'image.")
            return
          }
          const url = URL.createObjectURL(compressed)
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          setImageFile(compressed)
          setPreviewUrl(url)
          setUploadProgress(100)
          readImageInfo(compressed, url)
        } catch (err) {
          console.error('[CreateCardModal] Erreur compression:', formatErr(err))
          setImageError("Erreur lors du traitement de l'image.")
        }
      } else {
        // Personal : preview immédiate + auto-upload
        if (!user?.id) {
          setImageError('Utilisateur non connecté.')
          return
        }
        const url = URL.createObjectURL(file)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setImageFile(file)
        setPreviewUrl(url)
        setUploadProgress(0)
        readImageInfo(file, url)

        // Auto-upload
        const cardId = crypto.randomUUID()
        setUploadedCardId(cardId)
        setIsUploading(true)

        try {
          setUploadProgress(20)
          const result = await uploadCardImage(file, {
            accountId: user.id,
            cardId,
          })

          if (result.error) throw result.error

          setUploadProgress(100)
          setUploadedImagePath(result.path)
        } catch (err) {
          console.error('[CreateCardModal] Erreur auto-upload:', formatErr(err))
          setImageError(
            (err as Error).message || "Erreur lors de l'upload de l'image."
          )
          setUploadedImagePath(null)
          setUploadedCardId(null)
        } finally {
          setIsUploading(false)
        }
      }
    },
    [variant, user?.id, previewUrl, readImageInfo]
  )

  // ── Handlers sélection ─────────────────────────────────────────────────────
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // ── Suppression image ──────────────────────────────────────────────────────
  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(null)
    setPreviewUrl(null)
    setImageInfo(null)
    setUploadProgress(0)
    setUploadedImagePath(null)
    setUploadedCardId(null)
    setImageError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Soumission (bank) ──────────────────────────────────────────────────────
  const handleCreateBankCard = async () => {
    if (!isValid || !imageFile) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const cardId = crypto.randomUUID()
      setUploadProgress(33)

      const { path, error: uploadError } = await uploadBankCardImage(
        imageFile,
        {
          cardId,
        }
      )

      if (uploadError || !path) {
        showToast(
          uploadError?.message || "Erreur lors de l'upload de l'image.",
          'error'
        )
        setIsUploading(false)
        return
      }

      setUploadProgress(66)

      const { error: createError } = await createBankCard({
        id: cardId,
        name: name.trim(),
        image_url: path,
        published,
      })

      if (createError) {
        showToast(
          createError.message || 'Erreur lors de la création de la carte.',
          'error'
        )
        setIsUploading(false)
        return
      }

      setUploadProgress(100)
      onSuccess?.()
    } catch (err) {
      console.error('[CreateCardModal] Erreur inattendue:', formatErr(err))
      showToast('Une erreur inattendue est survenue.', 'error')
      setIsUploading(false)
    }
  }

  // ── Soumission (personal) ──────────────────────────────────────────────────
  const handleCreatePersonalCard = () => {
    if (!isValid || !imageFile || !uploadedImagePath || !uploadedCardId) return

    committedRef.current = true
    onSubmit?.({
      label: name.trim(),
      categorie,
      image: imageFile,
      imagePath: uploadedImagePath,
      imageUrl: uploadedImagePath,
      cardId: uploadedCardId,
    })
  }

  // ── Handler submit unifié ──────────────────────────────────────────────────
  const handleCreate = () => {
    if (variant === 'bank') {
      void handleCreateBankCard()
    } else {
      handleCreatePersonalCard()
    }
  }

  // ── Config selon variant ───────────────────────────────────────────────────
  const subtitle =
    variant === 'bank'
      ? 'Ajouter un pictogramme à la banque'
      : 'Ajouter un pictogramme personnel'

  const categoryOptions = [
    { value: 'none', label: 'Sans catégorie' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Nouvelle carte"
      subtitle={subtitle}
      size="medium"
      closeOnOverlay={!isUploading}
      closeOnEscape={!isUploading}
      showCloseButton={!isUploading}
      overlayClassName={overlayClassName}
      actions={[
        {
          label: 'Annuler',
          onClick: onClose,
          variant: 'secondary',
          disabled: isUploading,
        },
        {
          label: isUploading ? 'Création…' : 'Créer la carte',
          onClick: handleCreate,
          variant: 'primary',
          disabled: !isValid || isUploading,
        },
      ]}
      className="create-card-modal"
    >
      {/* ── Saisie du nom ──────────────────────────────────────────────────── */}
      <div className="create-card-modal__field">
        <div className="create-card-modal__field-header">
          <label
            htmlFor="create-card-name"
            className="create-card-modal__label"
          >
            Nom de la carte{' '}
            <span className="create-card-modal__required" aria-hidden="true">
              *
            </span>
          </label>
          <span
            className="create-card-modal__counter"
            aria-live="polite"
            aria-atomic="true"
          >
            {name.length}/100
          </span>
        </div>
        <input
          id="create-card-name"
          type="text"
          className="create-card-modal__input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex : Se brosser les dents"
          maxLength={100}
          disabled={isUploading}
          autoFocus
          aria-required="true"
        />
      </div>

      {/* ── Catégorie (personal uniquement) ────────────────────────────────── */}
      {variant === 'personal' && (
        <div className="create-card-modal__field">
          <Select
            id="create-card-categorie"
            label="Catégorie"
            options={categoryOptions}
            value={categorie}
            onChange={val => setCategorie(String(val))}
            disabled={isUploading}
          />
        </div>
      )}

      {/* ── Upload image ────────────────────────────────────────────────────── */}
      <div className="create-card-modal__field">
        <div className="create-card-modal__field-header">
          <label className="create-card-modal__label">
            Image{' '}
            <span className="create-card-modal__required" aria-hidden="true">
              *
            </span>
          </label>
          <span className="create-card-modal__format-hint">
            JPEG, PNG, WebP · max 100 Ko
          </span>
        </div>

        {/* Input natif masqué */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={isUploading}
          className="create-card-modal__file-native"
          aria-hidden="true"
          tabIndex={-1}
        />

        {!imageFile ? (
          /* Zone drag & drop */
          <div
            className={`create-card-modal__dropzone${isDragOver ? ' create-card-modal__dropzone--active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            aria-label="Zone de dépôt d'image. Cliquez ou déposez une image."
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleBrowseClick()
              }
            }}
            onClick={handleBrowseClick}
          >
            <span
              className="create-card-modal__dropzone-icon"
              aria-hidden="true"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <p className="create-card-modal__dropzone-text">
              Glisser une image ou{' '}
              <span className="create-card-modal__dropzone-link" role="link">
                parcourir
              </span>
            </p>
            <p className="create-card-modal__dropzone-hint">
              Carré recommandé · sera compressée automatiquement
            </p>
          </div>
        ) : (
          /* Prévisualisation fichier */
          <div className="create-card-modal__preview">
            <div className="create-card-modal__preview-thumb">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Aperçu de la carte"
                  className="create-card-modal__preview-img"
                />
              )}
            </div>
            <div className="create-card-modal__preview-info">
              <span className="create-card-modal__preview-filename">
                {imageInfo?.filename ?? imageFile.name}
              </span>
              {imageInfo && (
                <span className="create-card-modal__preview-meta">
                  {imageInfo.sizeKo} Ko · {imageInfo.width} × {imageInfo.height}{' '}
                  px
                </span>
              )}
              <div
                className="create-card-modal__progress-bar"
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={isUploading ? 'Upload en cours' : 'Image prête'}
              >
                <div
                  className="create-card-modal__progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="default"
              className="create-card-modal__preview-delete"
              onClick={handleRemoveImage}
              disabled={isUploading}
              aria-label="Supprimer l'image sélectionnée"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </Button>
          </div>
        )}

        {imageError && (
          <p className="create-card-modal__image-error" role="alert">
            {imageError}
          </p>
        )}
      </div>

      {/* ── Toggle publié/brouillon (bank uniquement) ──────────────────────── */}
      {variant === 'bank' && (
        <div className="create-card-modal__toggle-field">
          <Toggle
            id="create-card-published"
            checked={published}
            onChange={setPublished}
            aria-label={published ? 'Publiée immédiatement' : 'En brouillon'}
            disabled={isUploading}
          />
          <div className="create-card-modal__toggle-text">
            <span className="create-card-modal__toggle-label">
              {published ? 'Publiée immédiatement' : 'En brouillon'}
            </span>
            <span className="create-card-modal__toggle-hint">
              {published
                ? 'La carte sera visible par tous les utilisateurs dès la création.'
                : 'Visible uniquement par les administrateurs. Publiable plus tard.'}
            </span>
          </div>
        </div>
      )}
    </Modal>
  )
}
