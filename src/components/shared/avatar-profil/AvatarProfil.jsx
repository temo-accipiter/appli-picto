// src/components/AvatarProfil.jsx
// Sélecteur d’avatar. Conserve l’API (onUpload/onDelete), mais aligne les imports et passe à 100 Ko.

import { Button, ButtonDelete, SignedImage } from '@/components'
import {
  compressImageIfNeeded,
  compressionErrorMessage,
  validateImageHeader,
  validateImageType,
} from '@/utils/validationRules'
import { supabase } from '@/utils/supabaseClient'
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

    if (import.meta.env.DEV) {
      console.log('🔍 AvatarProfil - handleFileChange début', {
        fileName: file.name,
        fileSize: file.size,
      })
    }

    // 🛡️ Validation du type + en-tête
    try {
      const typeError = validateImageType(file)
      if (typeError) {
        console.error('❌ AvatarProfil - Erreur type:', typeError)
        setImageError(typeError)
        return
      }

      if (import.meta.env.DEV) {
        console.log('🔍 AvatarProfil - Type OK, validation header...')
      }

      const headerError = await validateImageHeader(file)
      if (headerError) {
        console.error('❌ AvatarProfil - Erreur header:', headerError)
        setImageError(headerError)
        return
      }

      if (import.meta.env.DEV) {
        console.log('🔍 AvatarProfil - Header OK')
      }
    } catch (err) {
      console.error('❌ AvatarProfil - Exception validation:', err)
      setImageError('Erreur lors de la validation du fichier')
      return
    }

    // 🎯 Compression UI (cible config = 100 Ko)
    const compressed = await compressImageIfNeeded(file)
    if (!compressed) {
      console.error('❌ AvatarProfil - Erreur compression')
      setImageError(compressionErrorMessage)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id || 'anonymous'
    const timestamp = Date.now()
    const extension = compressed.type === 'image/jpeg' ? 'jpg' : 'png'
    const cleanName = `avatar_${userId}_${timestamp}.${extension}`

    const finalFile = new File([compressed], cleanName, {
      type: compressed.type,
      lastModified: compressed.lastModified,
    })

    if (import.meta.env.DEV) {
      console.log('🔍 AvatarProfil - Avant appel onUpload', {
        finalFileName: finalFile.name,
        hasOnUpload: !!onUpload,
      })
    }

    setImageError('')
    onUpload?.(finalFile) // on laisse le parent uploader vers le bucket 'avatars'

    if (import.meta.env.DEV) {
      console.log('🔍 AvatarProfil - Après appel onUpload')
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
