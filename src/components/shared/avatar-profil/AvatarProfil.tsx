'use client'

// src/components/AvatarProfil.tsx
// Sélecteur d'avatar. Conserve l'API (onUpload/onDelete), mais aligne les imports et passe à 100 Ko.

import React, { useRef, useState } from 'react'
import { SignedImage } from '@/components'
import {
  compressImageIfNeeded,
  compressionErrorMessage,
  validateImageHeader,
  validateImageType,
} from '@/utils/validationRules'
import { supabase } from '@/utils/supabaseClient'
import './AvatarProfil.scss'

interface AvatarProfilProps {
  avatarPath?: string | null
  pseudo?: string
  onUpload?: (file: File) => void
  onDelete?: () => void
}

export default function AvatarProfil({
  avatarPath,
  pseudo = '',
  onUpload,
  onDelete,
}: AvatarProfilProps) {
  const [imageError, setImageError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 🛡️ Validation du type + en-tête
    try {
      const typeError = validateImageType(file)
      if (typeError) {
        console.error('❌ AvatarProfil - Erreur type:', typeError)
        setImageError(typeError)
        return
      }

      const headerError = await validateImageHeader(file)
      if (headerError) {
        console.error('❌ AvatarProfil - Erreur header:', headerError)
        setImageError(headerError)
        return
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

    setImageError('')
    onUpload?.(finalFile) // on laisse le parent uploader vers le bucket 'avatars'
  }

  // WCAG 1.1.1 - Alt personnalisé avec le pseudo
  const avatarAlt = pseudo ? `Avatar de ${pseudo}` : 'Avatar utilisateur'

  return (
    <div className="avatar-container">
      {avatarPath ? (
        <SignedImage
          filePath={avatarPath}
          bucket="personal-images"
          alt={avatarAlt}
          size={160}
          className="avatar-profil"
        />
      ) : (
        <div className="avatar-fallback">
          {pseudo?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="avatar-upload-btn"
        aria-label="Changer l'avatar"
        title="Modifier l'avatar"
      >
        +
      </button>

      {avatarPath && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="avatar-delete-btn"
          aria-label="Supprimer l'avatar"
          title="Supprimer l'avatar"
        >
          ×
        </button>
      )}

      {/*
       * Input file natif intentionnellement conservé ici (pas de primitive InputFile).
       * Raison : le bouton déclencheur (.avatar-upload-btn) est un cercle "+"
       * positionné en position:absolute overlay sur l'avatar — structurellement
       * incompatible avec la primitive InputFile (trigger inline pleine largeur).
       */}
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
