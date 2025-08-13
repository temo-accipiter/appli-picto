export const validateNotEmpty = label =>
  !label.trim() ? 'Le nom est requis' : ''

export const noEdgeSpaces = label =>
  label !== label.trim() ? 'Pas d’espace en début/fin' : ''

export const noDoubleSpaces = label =>
  /\s{2,}/.test(label) ? 'Pas de doubles espaces' : ''

export const validatePseudo = pseudo => {
  const trimmed = pseudo.trim()
  if (!trimmed) return 'Le pseudo est requis.'
  if (trimmed.length > 30)
    return 'Le pseudo ne doit pas dépasser 30 caractères.'
  return ''
}

/* ➕ Normalisation finale (enregistrement) : supprime espaces doublons et bords */
export const normalizeSpaces = s => (s ?? '').replace(/\s{2,}/g, ' ').trim()

// --- Validation images (inchangé) ---
export const validateImagePresence = file =>
  !file ? 'Choisis une image (PNG, JPEG, JPG, SVG, WEBP ≤ 2 Mo)' : ''

export const validateImageType = file =>
  file &&
  ![
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml',
  ].includes(file.type)
    ? 'Format non supporté.\nChoisis une image (PNG, JPG, SVG, WEBP ≤ 2 Mo)'
    : ''

export const compressionErrorMessage =
  'Image trop lourde même après compression (max 2 Mo).'

// --- Email ---
export const validateEmail = (email = '') => {
  const e = String(email).trim()
  if (!e) return 'L’e-mail est requis.'
  if (/\s/.test(e)) return 'L’e-mail ne doit pas contenir d’espace.'
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!re.test(e)) return 'Format d’e-mail invalide.'
  return ''
}
export const normalizeEmail = (email = '') => String(email).trim().toLowerCase()

// --- Mot de passe (aligné Supabase) ---
export const PASSWORD_MIN = 10

export const validatePasswordStrength = (pw = '') => {
  if (!pw) return 'Le mot de passe est requis.'
  if (pw.length < PASSWORD_MIN)
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`
  if (!/[a-z]/.test(pw)) return 'Ajoute au moins une lettre minuscule.'
  if (!/[A-Z]/.test(pw)) return 'Ajoute au moins une lettre majuscule.'
  if (!/[0-9]/.test(pw)) return 'Ajoute au moins un chiffre.'
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Ajoute au moins un symbole.'
  if (/\s/.test(pw)) return 'Le mot de passe ne doit pas contenir d’espace.'
  return ''
}

// Pour l’écran de Login : on ne bloque pas par complexité (compatibilité anciens comptes)
export const validatePasswordNotEmpty = (pw = '') =>
  pw ? '' : 'Le mot de passe est requis.'

// Règle "doit correspondre à..." (ex: confirmer le mot de passe)
export const makeMatchRule =
  (getOther, message = 'Les valeurs ne correspondent pas.') =>
  value =>
    value === getOther() ? '' : message

// ✅ Compression automatique si image > 500 Ko (inchangé)
export const compressImageIfNeeded = async (file, maxSizeKo = 100) => {
  if (!file || file.type === 'image/svg+xml' || file.size <= maxSizeKo * 1024) {
    return file
  }
  return new Promise(resolve => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const reader = new FileReader()
    reader.onload = e => {
      img.src = e.target.result
    }
    img.onload = () => {
      const maxWidth = 512,
        maxHeight = 512
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      const hasAlpha = file.type === 'image/png' || file.type === 'image/webp'
      const outputType = hasAlpha ? 'image/png' : 'image/jpeg'
      const quality = outputType === 'image/jpeg' ? 0.6 : 1
      canvas.toBlob(
        blob => {
          const extension = outputType === 'image/png' ? 'png' : 'jpg'
          const fileName = file.name.replace(/\.\w+$/, `.${extension}`)
          const compressedFile = new File([blob], fileName, {
            type: outputType,
            lastModified: Date.now(),
          })
          if (compressedFile.size > 2 * 1024 * 1024) resolve(null)
          else resolve(compressedFile)
        },
        outputType,
        quality
      )
    }
    reader.readAsDataURL(file)
  })
}
