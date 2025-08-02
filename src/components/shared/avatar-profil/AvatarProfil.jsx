import { useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { supabase } from '@/utils'
import { Button, ButtonDelete } from '@/components'
import { validateImageType, validateImageSize } from '@/utils'
import './AvatarProfil.scss'

export default function AvatarProfil({
  avatarPath,
  pseudo = '',
  onUpload,
  onDelete,
}) {
  const [url, setUrl] = useState(null)
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

  const handleFileChange = e => {
    const file = e.target.files?.[0]
    if (!file) return

    const typeError = validateImageType(file)
    const sizeError = validateImageSize(file)

    if (typeError || sizeError) {
      alert(typeError || sizeError)
      return
    }

    if (onUpload) {
      onUpload(file)
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

      {/* ➕ Bouton d’upload */}
      <Button
        onClick={() => inputRef.current?.click()}
        label="+"
        variant="default"
        className="avatar-upload-btn"
        aria-label="Changer l’avatar"
        title="Changer l’avatar"
      />

      {/* 🗑 Bouton delete animé */}
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
    </div>
  )
}

AvatarProfil.propTypes = {
  avatarPath: PropTypes.string,
  pseudo: PropTypes.string,
  onUpload: PropTypes.func,
  onDelete: PropTypes.func,
}
