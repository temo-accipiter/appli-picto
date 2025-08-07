/*
import { useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { supabase } from '@/utils'
import {
  compressImageIfNeeded,
  validateImageType,
  compressionErrorMessage,
} from '@/utils'
import { Button, ButtonDelete } from '@/components'
import './AvatarProfil.scss'

export default function AvatarProfil({
  avatarPath,
  pseudo = '',
  onUpload,
  onDelete,
}) {
  const [url, setUrl] = useState(null)
  const [imageError, setImageError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const fetchUrl = async () => {
      if (!avatarPath) return
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(avatarPath, 60 * 60)
      if (!error && data?.signedUrl) {
        setUrl(data.signedUrl)
      }
    }

    fetchUrl()
  }, [avatarPath])

  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return

    const typeError = validateImageType(file)
    if (typeError) {
      setImageError(typeError)
      return
    }

    const compressed = await compressImageIfNeeded(file)
    if (!compressed || compressed.size > 2 * 1024 * 1024) {
      setImageError(compressionErrorMessage)
      return
    }

    const ext = file.type.split('/')[1] || 'png'
    const timestamp = Date.now()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id || 'anonymous'

    const cleanName = `avatar_${userId}_${timestamp}.${ext}`

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
      {url ? (
        <img
          src={url}
          alt="Avatar utilisateur"
          className="avatar-profil"
          width={80}
          height={80}
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
*/
import { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { supabase } from '@/utils'
import {
  compressImageIfNeeded,
  validateImageType,
  compressionErrorMessage,
} from '@/utils'
import { Button, ButtonDelete, SignedImage } from '@/components'
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

    const typeError = validateImageType(file)
    if (typeError) {
      setImageError(typeError)
      return
    }

    const compressed = await compressImageIfNeeded(file)
    if (!compressed || compressed.size > 2 * 1024 * 1024) {
      setImageError(compressionErrorMessage)
      return
    }

    const ext = file.type.split('/')[1] || 'png'
    const timestamp = Date.now()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id || 'anonymous'

    const cleanName = `avatar_${userId}_${timestamp}.${ext}`

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
