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

// --- Validation des rôles ---
export const validateRoleName = (name = '') => {
  const trimmed = name.trim()
  if (!trimmed) return 'Le nom du rôle est requis.'
  if (trimmed.length < 2) return 'Le nom doit faire au moins 2 caractères.'
  if (trimmed.length > 20) return 'Le nom ne peut pas dépasser 20 caractères.'
  if (!/^[a-z0-9_-]+$/.test(trimmed)) {
    return 'Utilisez seulement des lettres minuscules, chiffres, tirets et underscores.'
  }
  return ''
}

export const validateRoleDisplayName = (displayName = '') => {
  const trimmed = displayName.trim()
  if (!trimmed) return 'Le nom d\'affichage est requis.'
  if (trimmed.length < 3) return 'Le nom d\'affichage doit faire au moins 3 caractères.'
  if (trimmed.length > 50) return 'Le nom d\'affichage ne peut pas dépasser 50 caractères.'
  return ''
}

export const validateRoleDescription = (description = '') => {
  if (description && description.length > 200) {
    return 'La description ne peut pas dépasser 200 caractères.'
  }
  return ''
}

// Vérification de l'unicité du nom de rôle
export const validateRoleNameUniqueness = (name, existingRoles, currentRoleId = null) => {
  const trimmed = name.trim()
  if (!trimmed) return ''
  
  const isDuplicate = existingRoles.some(role => 
    role.name === trimmed && role.id !== currentRoleId
  )
  
  return isDuplicate ? 'Ce nom de rôle existe déjà.' : ''
}

// Règles combinées pour la création d'un rôle
export const createRoleValidationRules = {
  name: (value, existingRoles) => [
    validateRoleName(value),
    validateRoleNameUniqueness(value, existingRoles)
  ].filter(Boolean),
  
  displayName: (value) => [
    validateRoleDisplayName(value)
  ].filter(Boolean),
  
  description: (value) => [
    validateRoleDescription(value)
  ].filter(Boolean)
}

// Règles combinées pour la modification d'un rôle
export const updateRoleValidationRules = {
  displayName: (value) => [
    validateRoleDisplayName(value)
  ].filter(Boolean),
  
  description: (value) => [
    validateRoleDescription(value)
  ].filter(Boolean)
}

// --- Validation des fonctionnalités ---
export const validateFeatureName = (name = '') => {
  const trimmed = name.trim()
  if (!trimmed) return 'Le nom technique est requis.'
  if (trimmed.length < 3) return 'Le nom doit faire au moins 3 caractères.'
  if (trimmed.length > 50) return 'Le nom ne peut pas dépasser 50 caractères.'
  if (!/^[a-z0-9_-]+$/.test(trimmed)) {
    return 'Utilisez seulement des lettres minuscules, chiffres, tirets et underscores.'
  }
  return ''
}

export const validateFeatureDisplayName = (displayName = '') => {
  const trimmed = displayName.trim()
  if (!trimmed) return 'Le nom d\'affichage est requis.'
  if (trimmed.length < 3) return 'Le nom d\'affichage doit faire au moins 3 caractères.'
  if (trimmed.length > 100) return 'Le nom d\'affichage ne peut pas dépasser 100 caractères.'
  return ''
}

export const validateFeatureDescription = (description = '') => {
  if (description && description.length > 500) {
    return 'La description ne peut pas dépasser 500 caractères.'
  }
  return ''
}

// Vérification de l'unicité du nom de fonctionnalité
export const validateFeatureNameUniqueness = (name, existingFeatures, currentFeatureId = null) => {
  const trimmed = name.trim()
  if (!trimmed) return ''
  
  const isDuplicate = existingFeatures.some(feature => 
    feature.name === trimmed && feature.id !== currentFeatureId
  )
  
  return isDuplicate ? 'Ce nom de fonctionnalité existe déjà.' : ''
}

// Règles combinées pour la création d'une fonctionnalité
export const createFeatureValidationRules = {
  name: (value, existingFeatures) => [
    validateFeatureName(value),
    validateFeatureNameUniqueness(value, existingFeatures)
  ].filter(Boolean),
  
  displayName: (value) => [
    validateFeatureDisplayName(value)
  ].filter(Boolean),
  
  description: (value) => [
    validateFeatureDescription(value)
  ].filter(Boolean)
}
