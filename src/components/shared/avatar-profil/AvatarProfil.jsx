import { Button, ButtonDelete, SignedImage } from '@/components'
import {
  compressImageIfNeeded,
  compressionErrorMessage,
  supabase,
  validateImageHeader,
  validateImageType,
} from '@/utils'
import PropTypes from 'prop-types'
import { useRef, useState } from 'react'
import './AvatarProfil.scss'

export default function AvatarProfil({
  avatarPath,
  pseudo = '',
  onUpload,
  onDelete,
}) {
  const [imageError, setImageError] = useState('')
  const inputRef = useRef(null)

  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return

    // 🛡️ Validation du type de fichier
    const typeError = validateImageType(file)
    if (typeError) {
      setImageError(typeError)
      return
    }

    // 🛡️ Validation sécurisée de l'en-tête
    const headerError = await validateImageHeader(file)
    if (headerError) {
      setImageError(headerError)
      return
    }

    // 🎯 Compression et optimisation automatique (50 Ko max, 256x256px, PNG)
    const compressed = await compressImageIfNeeded(file)
    if (!compressed) {
      setImageError(compressionErrorMessage)
      return
    }

    // Le fichier compressé peut être JPEG ou PNG selon l'optimisation
    const timestamp = Date.now()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id || 'anonymous'

    const extension = compressed.type === 'image/jpeg' ? 'jpg' : 'png'
    const cleanName = `avatar_${userId}_${timestamp}.${extension}`

    const finalFile = new File([compressed], cleanName, {
      type: compressed.type,
      lastModified: compressed.lastModified,
    })

    setImageError('')
    if (onUpload) {
      onUpload(finalFile)
    }
  }

  return (
    <div className="avatar-container">
      {avatarPath ? (
        <SignedImage
          filePath={avatarPath}
          bucket="avatars"
          alt="Avatar utilisateur"
          size={80}
        />
      ) : (
        <div className="avatar-fallback">
          {pseudo?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      )}

      <Button
        onClick={() => inputRef.current?.click()}
        label="+"
        variant="default"
        className="avatar-upload-btn"
        aria-label="Changer l’avatar"
        title="Changer l’avatar"
      />

      {avatarPath && (
        <ButtonDelete onClick={onDelete} title="Supprimer l’avatar" />
      )}

      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {imageError && (
        <div className="input-field__error-message message-erreur">
          {imageError}
        </div>
      )}
    </div>
  )
}

AvatarProfil.propTypes = {
  avatarPath: PropTypes.string,
  pseudo: PropTypes.string,
  onUpload: PropTypes.func,
  onDelete: PropTypes.func,
}
