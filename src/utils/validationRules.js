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
  !file ? 'Choisis une image (PNG, JPEG, JPG, SVG, WEBP ≤ 50 Ko)' : ''

export const validateImageType = file =>
  file &&
  ![
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml',
  ].includes(file.type)
    ? 'Format non supporté.\nChoisis une image (PNG, JPG, SVG, WEBP ≤ 50 Ko)'
    : ''

// 🛡️ Validation sécurisée de l'en-tête du fichier (protection contre les faux fichiers)
export const validateImageHeader = async (file) => {
  if (!file) return ''
  
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target.result)
      let header = ''
      for (let i = 0; i < Math.min(4, arr.length); i++) {
        header += arr[i].toString(16).padStart(2, '0')
      }
      
      // Vérification des signatures de fichiers (magic bytes)
      const validHeaders = {
        '89504e47': 'PNG',
        'ffd8ffe0': 'JPEG',
        'ffd8ffe1': 'JPEG',
        'ffd8ffe2': 'JPEG',
        'ffd8ffe3': 'JPEG',
        '52494646': 'WEBP', // RIFF (début WEBP)
        '3c3f786d': 'SVG',  // <?xml
        '3c737667': 'SVG'   // <svg
      }
      
      const isValid = Object.keys(validHeaders).some(h => header.startsWith(h))
      resolve(isValid ? '' : 'Fichier image corrompu ou invalide.')
    }
    reader.onerror = () => resolve('Erreur lors de la lecture du fichier.')
    reader.readAsArrayBuffer(file.slice(0, 4))
  })
}

export const compressionErrorMessage =
  'Impossible de compresser cette image sous 50 Ko.\nEssayez une image plus simple ou de meilleure qualité.'

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

// ✅ Compression progressive pour pictos (50 Ko max, dimensions adaptatives)
export const compressImageIfNeeded = async (file, maxSizeKo = 50) => {
  if (!file || file.type === 'image/svg+xml' || file.size <= maxSizeKo * 1024) {
    return file
  }

  return new Promise(resolve => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = e => {
      img.src = e.target.result
    }
    
    img.onload = () => {
      // 🔄 Stratégie de compression progressive
      const compressionStrategies = [
        // Étape 1: Dimensions normales, qualité élevée
        { maxWidth: 256, maxHeight: 256, quality: 0.9, useJPEG: true },
        // Étape 2: Dimensions normales, qualité moyenne
        { maxWidth: 256, maxHeight: 256, quality: 0.7, useJPEG: true },
        // Étape 3: Dimensions normales, qualité basse
        { maxWidth: 256, maxHeight: 256, quality: 0.5, useJPEG: true },
        // Étape 4: Dimensions réduites, qualité moyenne
        { maxWidth: 192, maxHeight: 192, quality: 0.7, useJPEG: true },
        // Étape 5: Dimensions réduites, qualité basse
        { maxWidth: 192, maxHeight: 192, quality: 0.5, useJPEG: true },
        // Étape 6: Très petites dimensions, qualité basse
        { maxWidth: 128, maxHeight: 128, quality: 0.4, useJPEG: true },
        // Étape 7: PNG en dernier recours (plus gros mais meilleure qualité)
        { maxWidth: 128, maxHeight: 128, quality: 1, useJPEG: false }
      ]

      const tryCompression = async (strategyIndex = 0) => {
        if (strategyIndex >= compressionStrategies.length) {
          // Toutes les stratégies épuisées, on rejette
          resolve(null)
          return
        }

        const strategy = compressionStrategies[strategyIndex]
        const canvas = document.createElement('canvas')
        
        // Calcul des dimensions avec la stratégie actuelle
        let { width, height } = img
        if (width > strategy.maxWidth || height > strategy.maxHeight) {
          const ratio = Math.min(strategy.maxWidth / width, strategy.maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        // 🛡️ Sécurité CNIL : Suppression automatique des métadonnées
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        // Format et qualité selon la stratégie
        const outputType = strategy.useJPEG ? 'image/jpeg' : 'image/png'
        const quality = strategy.useJPEG ? strategy.quality : 1

        canvas.toBlob(
          blob => {
            const extension = strategy.useJPEG ? 'jpg' : 'png'
            const fileName = file.name.replace(/\.\w+$/, `.${extension}`)
            const compressedFile = new File([blob], fileName, {
              type: outputType,
              lastModified: Date.now(),
            })

            // ✅ Vérifier si on a atteint la taille cible
            if (compressedFile.size <= maxSizeKo * 1024) {
              // 🎉 Succès ! On retourne le fichier compressé
              resolve(compressedFile)
            } else {
              // 🔄 Pas encore assez petit, essayer la stratégie suivante
              tryCompression(strategyIndex + 1)
            }
          },
          outputType,
          quality
        )
      }

      // Démarrer la compression progressive
      tryCompression(0)
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
