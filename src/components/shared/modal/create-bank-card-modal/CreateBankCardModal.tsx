'use client'

// src/page-components/admin/bank-cards/CreateBankCardModal.tsx
/**
 * Modal de création d'une Carte de Banque (Admin uniquement)
 *
 * Règles DB-First strict :
 * - Création directe avec type='bank', account_id=null
 * - Upload vers bucket bank-images (admin-only, public read)
 * - Path strict flat : {cardId}.jpg (pas de sous-dossiers)
 * - published : true (publiée) ou false (dépubliée) - choix utilisateur
 * - RLS is_admin() enforced côté DB (Storage + table cards)
 *
 * UX TSA :
 * - Étapes claires : nom → image → published → créer
 * - Preview immédiat de l'image
 * - Validation avant soumission
 * - Feedback clair (loading, erreurs)
 * - Pas de surprises visuelles
 */

import { useState, useRef } from 'react'
import Modal from '@/components/shared/modal/Modal'
import { Button, Input, InputFile, UploadProgress } from '@/components'
import { useAdminBankCards } from '@/hooks'
import { useToast } from '@/contexts'
import { uploadBankCardImage } from '@/utils/storage/uploadBankCardImage'
import { compressImageIfNeeded } from '@/utils/validationRules'
import formatErr from '@/utils/logs/formatErr'
import './CreateBankCardModal.scss'

interface CreateBankCardModalProps {
  onClose: () => void
  onSuccess: () => void
  overlayClassName?: string | undefined
}

export default function CreateBankCardModal({
  onClose,
  onSuccess,
  overlayClassName,
}: CreateBankCardModalProps) {
  const { show: showToast } = useToast()
  const { createCard } = useAdminBankCards()

  // État formulaire
  const [name, setName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [published, setPublished] = useState(false) // Défaut : dépubliée (brouillon)

  // État upload/création
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Ref input file
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validation formulaire
  const isValid = name.trim() !== '' && imageFile !== null

  // Gestion sélection image
  const handleImageSelect = async (file: File | null) => {
    if (!file) return

    // Vérification type
    if (!file.type.startsWith('image/')) {
      showToast('Le fichier sélectionné doit être une image', 'error')
      return
    }

    // Compression immédiate (max 100KB)
    try {
      const compressedFile = await compressImageIfNeeded(file)

      if (!compressedFile) {
        showToast("Impossible de traiter l'image", 'error')
        return
      }

      setImageFile(compressedFile)

      // Preview
      const reader = new FileReader()
      reader.onload = e => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(compressedFile)
    } catch (err) {
      console.error('[CreateBankCardModal] Erreur compression:', formatErr(err))
      showToast("Erreur lors du traitement de l'image", 'error')
    }
  }

  // Supprimer image sélectionnée
  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Création carte (upload + DB insert)
  const handleCreate = async () => {
    if (!isValid) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Étape 1/3 : Générer UUID v4 pour la carte
      const cardId = crypto.randomUUID()
      setUploadProgress(33)

      // Étape 2/3 : Upload image vers Storage bank-images
      const { path, error: uploadError } = await uploadBankCardImage(
        imageFile,
        {
          cardId,
        }
      )

      if (uploadError || !path) {
        console.error(
          '[CreateBankCardModal] Erreur upload Storage:',
          formatErr(uploadError)
        )
        showToast(
          uploadError?.message || "Erreur lors de l'upload de l'image",
          'error'
        )
        setIsUploading(false)
        return
      }

      setUploadProgress(66)

      // Étape 3/3 : Créer carte en DB
      const { error: createError } = await createCard({
        id: cardId, // Même UUID que Storage
        name: name.trim(),
        image_url: path, // Path strict : {cardId}.jpg
        published,
      })

      if (createError) {
        console.error(
          '[CreateBankCardModal] Erreur création carte DB:',
          formatErr(createError)
        )
        showToast(
          createError.message || 'Erreur lors de la création de la carte',
          'error'
        )
        setIsUploading(false)
        return
      }

      setUploadProgress(100)

      // ✅ Succès : fermer modal + callback parent (refresh + toast)
      onSuccess()
    } catch (err) {
      console.error('[CreateBankCardModal] Erreur inattendue:', formatErr(err))
      showToast('Une erreur inattendue est survenue', 'error')
      setIsUploading(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Créer une carte de banque"
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
          label: isUploading ? 'Création...' : 'Créer',
          onClick: handleCreate,
          variant: 'primary',
          disabled: !isValid || isUploading,
        },
      ]}
      className="create-bank-card-modal"
    >
      <div className="create-bank-card-form">
        {/* Champ nom */}
        <div className="form-field">
          <label htmlFor="card-name">
            Nom de la carte <span className="required">*</span>
          </label>
          <Input
            id="card-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Se brosser les dents"
            disabled={isUploading}
            maxLength={100}
            autoFocus
          />
          <span className="field-hint">Maximum 100 caractères</span>
        </div>

        {/* Champ image */}
        <div className="form-field">
          <label htmlFor="card-image">
            Image <span className="required">*</span>
          </label>

          {!imagePreview ? (
            <div className="image-upload">
              <InputFile
                ref={fileInputRef}
                id="card-image"
                label="📷 Choisir une image"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={isUploading}
              />
              <span className="field-hint">
                Formats acceptés : JPEG, PNG, WebP (max 100 Ko après
                compression)
              </span>
            </div>
          ) : (
            <div className="image-preview">
              {/*
               * <img> natif conservé intentionnellement (pas de <ImagePreview>).
               * Raison : ImagePreview est conçu pour des thumbnails carrés fixes
               * (60/100/160px). Cette preview est pleine largeur responsive
               * (max-width: 300px) — structurellement incompatible.
               */}
              <img src={imagePreview} alt="Aperçu de la carte" />
              <Button
                variant="danger"
                className="remove-image"
                onClick={handleRemoveImage}
                disabled={isUploading}
              >
                ✕ Supprimer
              </Button>
            </div>
          )}
        </div>

        {/* Champ published */}
        <div className="form-field form-field--checkbox">
          <label htmlFor="card-published" className="checkbox-label">
            <input
              id="card-published"
              type="checkbox"
              checked={published}
              onChange={e => setPublished(e.target.checked)}
              disabled={isUploading}
            />
            <span className="checkbox-text">
              Publier immédiatement (visible par tous les utilisateurs)
            </span>
          </label>
          <span className="field-hint">
            {published
              ? 'La carte sera visible dans le catalogue public'
              : 'La carte sera dépubliée (visible uniquement par les admins)'}
          </span>
        </div>

        {/* Progression upload */}
        {isUploading && (
          <UploadProgress
            progress={uploadProgress}
            message={
              uploadProgress < 33
                ? 'Préparation...'
                : uploadProgress < 66
                  ? "Upload de l'image..."
                  : uploadProgress < 100
                    ? 'Création de la carte...'
                    : 'Terminé !'
            }
          />
        )}
      </div>
    </Modal>
  )
}
