// src/utils/validationRules.js
// Règles de validation/normalisation côté UI :
// - Textes, e-mails, mots de passe, rôles, fonctionnalités
// - Images : types MIME autorisés (alignés sur config), vérif en-tête, compression < TARGET_MAX_UI_SIZE_KO

import {
  ALLOWED_MIME_TYPES,
  TARGET_MAX_UI_SIZE_KO,
} from '@/utils/images/config'

/* =========================
 * Texte générique
 * ========================= */
export const validateNotEmpty = label =>
  !String(label ?? '').trim() ? 'Le nom est requis' : ''

export const noEdgeSpaces = label =>
  String(label ?? '') !== String(label ?? '').trim()
    ? "Pas d'espace en début/fin"
    : ''

export const noDoubleSpaces = label =>
  /\s{2,}/.test(String(label ?? '')) ? 'Pas de doubles espaces' : ''

/* =========================
 * Texte générique (i18n)
 * ========================= */
export const makeValidateNotEmpty = t => label =>
  !String(label ?? '').trim() ? t('validation.nameRequired') : ''

export const makeNoEdgeSpaces = t => label =>
  String(label ?? '') !== String(label ?? '').trim()
    ? t('validation.noEdgeSpaces')
    : ''

export const makeNoDoubleSpaces = t => label =>
  /\s{2,}/.test(String(label ?? '')) ? t('validation.noDoubleSpaces') : ''

export const validatePseudo = pseudo => {
  const trimmed = String(pseudo ?? '').trim()
  if (!trimmed) return 'Le pseudo est requis.'
  if (trimmed.length > 30)
    return 'Le pseudo ne doit pas dépasser 30 caractères.'
  return ''
}

/* ➕ Normalisation finale (enregistrement) : supprime espaces doublons et bords */
export const normalizeSpaces = s => (s ?? '').replace(/\s{2,}/g, ' ').trim()

/* =========================
 * Images (MÀJ → 100 Ko)
 * ========================= */

// Presence
export const validateImagePresence = file =>
  !file ? 'Choisis une image (PNG, JPEG/JPG, SVG, WEBP ≤ 100 Ko)' : ''

// Type MIME (aligné sur config) — on normalise image/jpg → image/jpeg
export const validateImageType = file => {
  if (!file) return 'Choisis une image (PNG, JPEG/JPG, SVG, WEBP ≤ 100 Ko)'
  const raw = String(file.type || '').toLowerCase()
  const type = raw === 'image/jpg' ? 'image/jpeg' : raw
  return !ALLOWED_MIME_TYPES.includes(type)
    ? 'Format non supporté.\nChoisis une image (PNG, JPEG/JPG, SVG, WEBP ≤ 100 Ko)'
    : ''
}

/* =========================
 * Images (i18n)
 * ========================= */
export const makeValidateImagePresence = t => file =>
  !file ? t('validation.chooseImage') : ''

export const makeValidateImageType = t => file => {
  if (!file) return t('validation.chooseImage')
  const raw = String(file.type || '').toLowerCase()
  const type = raw === 'image/jpg' ? 'image/jpeg' : raw
  return !ALLOWED_MIME_TYPES.includes(type)
    ? t('validation.unsupportedFormat')
    : ''
}

/**
 * Validation sécurisée de l'en-tête (magic bytes) — GIF volontairement non pris en charge.
 * PNG: 89 50 4E 47 0D 0A 1A 0A
 * JPEG: FF D8 (on ne vérifie que le début)
 * WEBP: "RIFF" .... "WEBP"
 * SVG: type textuel (on se contente de MIME + signature XML/<svg> éventuelle)
 */
export const validateImageHeader = async file => {
  if (!file) return ''
  try {
    const buf = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buf)

    const isPNG =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a

    const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8

    const isWebP =
      bytes[0] === 0x52 && // R
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x46 && // F
      bytes[8] === 0x57 && // W
      bytes[9] === 0x45 && // E
      bytes[10] === 0x42 && // B
      bytes[11] === 0x50 // P

    const isSVG = String(file.type).toLowerCase() === 'image/svg+xml'

    // HEIC : Type-based uniquement (magic bytes complexes)
    const isHEIC =
      String(file.type).toLowerCase() === 'image/heic' ||
      String(file.type).toLowerCase() === 'image/heif'

    if (isPNG || isJPEG || isWebP || isSVG || isHEIC) return ''
    return 'Fichier image corrompu ou invalide.'
  } catch {
    return 'Erreur lors de la lecture du fichier.'
  }
}

export const makeValidateImageHeader = t => async file => {
  if (!file) return ''
  try {
    const buf = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buf)

    const isPNG =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a

    const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8

    const isWebP =
      bytes[0] === 0x52 && // R
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x46 && // F
      bytes[8] === 0x57 && // W
      bytes[9] === 0x45 && // E
      bytes[10] === 0x42 && // B
      bytes[11] === 0x50 // P

    const isSVG = String(file.type).toLowerCase() === 'image/svg+xml'

    // HEIC : Type-based uniquement (magic bytes complexes)
    const isHEIC =
      String(file.type).toLowerCase() === 'image/heic' ||
      String(file.type).toLowerCase() === 'image/heif'

    if (isPNG || isJPEG || isWebP || isSVG || isHEIC) return ''
    return t('validation.corruptedFile')
  } catch {
    return t('validation.fileReadError')
  }
}

export const compressionErrorMessage =
  'Impossible de compresser cette image sous 100 Ko.\nEssayez une image plus simple ou de meilleure qualité.'

export const makeCompressionErrorMessage = t => t('validation.compressionError')

/**
 * Compression côté UI (progressive) pour pictos : cible = TARGET_MAX_UI_SIZE_KO.
 * - Si SVG : renvoie tel quel.
 * - Si déjà < cible : renvoie tel quel.
 * - Sinon : redimensionne progressivement et ajuste la qualité (JPEG) ; PNG en dernier recours.
 */
export const compressImageIfNeeded = async (
  file,
  maxSizeKo = TARGET_MAX_UI_SIZE_KO
) => {
  if (
    !file ||
    String(file.type).toLowerCase() === 'image/svg+xml' ||
    file.size <= maxSizeKo * 1024
  ) {
    return file
  }

  return new Promise(resolve => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = e => {
      img.src = e.target.result
    }

    img.onload = () => {
      // Stratégies progressives (dimension/qualité)
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
        // Étape 7: PNG en dernier recours (sans perte, peut être plus gros)
        { maxWidth: 128, maxHeight: 128, quality: 1, useJPEG: false },
      ]

      const tryCompression = async (strategyIndex = 0) => {
        if (strategyIndex >= compressionStrategies.length) {
          resolve(null) // échec (trop lourd malgré tout)
          return
        }

        const strategy = compressionStrategies[strategyIndex]
        const canvas = document.createElement('canvas')

        // Calcul dimensions
        let { width, height } = img
        if (width > strategy.maxWidth || height > strategy.maxHeight) {
          const ratio = Math.min(
            strategy.maxWidth / width,
            strategy.maxHeight / height
          )
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const outputType = strategy.useJPEG ? 'image/jpeg' : 'image/png'
        const quality = strategy.useJPEG ? strategy.quality : 1

        canvas.toBlob(
          blob => {
            if (!blob) {
              tryCompression(strategyIndex + 1)
              return
            }
            const extension = strategy.useJPEG ? 'jpg' : 'png'
            const fileName = String(file.name || 'image').replace(
              /\.\w+$/,
              `.${extension}`
            )
            const compressedFile = new File([blob], fileName, {
              type: outputType,
              lastModified: Date.now(),
            })

            if (compressedFile.size <= maxSizeKo * 1024) {
              resolve(compressedFile)
            } else {
              tryCompression(strategyIndex + 1)
            }
          },
          outputType,
          quality
        )
      }

      tryCompression(0)
    }

    reader.readAsDataURL(file)
  })
}

/* =========================
 * Email
 * ========================= */
export const validateEmail = (email = '') => {
  const e = String(email).trim()
  if (!e) return 'L’e-mail est requis.'
  if (/\s/.test(e)) return 'L’e-mail ne doit pas contenir d’espace.'
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!re.test(e)) return 'Format d’e-mail invalide.'
  return ''
}
export const normalizeEmail = (email = '') => String(email).trim().toLowerCase()

/* =========================
 * Mot de passe (aligné Supabase)
 * ========================= */
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

// Pour l'écran de Login : on ne bloque pas par complexité (compatibilité anciens comptes)
export const validatePasswordNotEmpty = (pw = '') =>
  pw ? '' : 'Le mot de passe est requis.'

// Version i18n de validatePasswordNotEmpty
export const makeValidatePasswordNotEmpty =
  t =>
  (pw = '') =>
    pw ? '' : t('auth.passwordRequired')

// Règle "doit correspondre à..." (ex: confirmer le mot de passe)
export const makeMatchRule =
  (getOther, message = 'Les valeurs ne correspondent pas.') =>
  value =>
    value === getOther() ? '' : message

/* =========================
 * Rôles
 * ========================= */
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
  if (!trimmed) return "Le nom d'affichage est requis."
  if (trimmed.length < 3)
    return "Le nom d'affichage doit faire au moins 3 caractères."
  if (trimmed.length > 50)
    return "Le nom d'affichage ne peut pas dépasser 50 caractères."
  return ''
}

export const validateRoleDescription = (description = '') => {
  if (description && description.length > 200) {
    return 'La description ne peut pas dépasser 200 caractères.'
  }
  return ''
}

// Vérification de l'unicité du nom de rôle
export const validateRoleNameUniqueness = (
  name,
  existingRoles,
  currentRoleId = null
) => {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return ''

  const isDuplicate = (existingRoles ?? []).some(
    role => role.name === trimmed && role.id !== currentRoleId
  )

  return isDuplicate ? 'Ce nom de rôle existe déjà.' : ''
}

// Règles combinées pour la création d'un rôle
export const createRoleValidationRules = {
  name: (value, existingRoles) =>
    [
      validateRoleName(value),
      validateRoleNameUniqueness(value, existingRoles),
    ].filter(Boolean),

  displayName: value => [validateRoleDisplayName(value)].filter(Boolean),

  description: value => [validateRoleDescription(value)].filter(Boolean),
}

// Règles combinées pour la modification d'un rôle
export const updateRoleValidationRules = {
  displayName: value => [validateRoleDisplayName(value)].filter(Boolean),

  description: value => [validateRoleDescription(value)].filter(Boolean),
}

/* =========================
 * Fonctionnalités (features)
 * ========================= */
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
  if (!trimmed) return "Le nom d'affichage est requis."
  if (trimmed.length < 3)
    return "Le nom d'affichage doit faire au moins 3 caractères."
  if (trimmed.length > 100)
    return "Le nom d'affichage ne peut pas dépasser 100 caractères."
  return ''
}

export const validateFeatureDescription = (description = '') => {
  if (description && description.length > 500) {
    return 'La description ne peut pas dépasser 500 caractères.'
  }
  return ''
}

// Vérification de l'unicité du nom de fonctionnalité
export const validateFeatureNameUniqueness = (
  name,
  existingFeatures,
  currentFeatureId = null
) => {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return ''

  const isDuplicate = (existingFeatures ?? []).some(
    feature => feature.name === trimmed && feature.id !== currentFeatureId
  )

  return isDuplicate ? 'Ce nom de fonctionnalité existe déjà.' : ''
}

// Règles combinées pour la création d'une fonctionnalité
export const createFeatureValidationRules = {
  name: (value, existingFeatures) =>
    [
      validateFeatureName(value),
      validateFeatureNameUniqueness(value, existingFeatures),
    ].filter(Boolean),

  displayName: value => [validateFeatureDisplayName(value)].filter(Boolean),

  description: value => [validateFeatureDescription(value)].filter(Boolean),
}
