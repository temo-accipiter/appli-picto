// src/utils/images/imageValidator.js
// Validation complète et unifiée des images (MIME type + magic bytes)

import { ALLOWED_MIME_TYPES } from '@/utils/images/config'

/**
 * Valide un fichier image (MIME type + magic bytes)
 *
 * Vérifie :
 * 1. Type MIME autorisé
 * 2. Magic bytes (signature fichier) pour détecter spoofing
 *
 * @param {File} file - Fichier à valider
 * @returns {Promise<{valid: boolean, error: string|null, normalizedType: string|null}>}
 *
 * @example
 * const { valid, error } = await validateImageFile(file)
 * if (!valid) {
 *   console.error(error)
 * }
 */
export async function validateImageFile(file) {
  if (!file) {
    return {
      valid: false,
      error: 'Aucun fichier fourni',
      normalizedType: null,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1️⃣ VALIDATION TYPE MIME
  // ─────────────────────────────────────────────────────────────
  const rawType = String(file.type || '').toLowerCase()
  const normalizedType = rawType === 'image/jpg' ? 'image/jpeg' : rawType

  if (!ALLOWED_MIME_TYPES.includes(normalizedType)) {
    return {
      valid: false,
      error: `Format non supporté.\nFormats acceptés : PNG, JPEG, WebP, SVG, HEIC`,
      normalizedType,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2️⃣ VALIDATION MAGIC BYTES (sécurité anti-spoofing)
  // ─────────────────────────────────────────────────────────────
  try {
    const buf = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buf)

    // PNG : 89 50 4E 47 0D 0A 1A 0A
    const isPNG =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a

    // JPEG : FF D8
    const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8

    // WebP : "RIFF" .... "WEBP"
    const isWebP =
      bytes[0] === 0x52 && // R
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x46 && // F
      bytes[8] === 0x57 && // W
      bytes[9] === 0x45 && // E
      bytes[10] === 0x42 && // B
      bytes[11] === 0x50 // P

    // SVG : Type textuel (pas de magic bytes fiables)
    const isSVG = normalizedType === 'image/svg+xml'

    // HEIC : Type-based uniquement (magic bytes complexes)
    const isHEIC =
      normalizedType === 'image/heic' || normalizedType === 'image/heif'

    if (isPNG || isJPEG || isWebP || isSVG || isHEIC) {
      return {
        valid: true,
        error: null,
        normalizedType,
      }
    }

    return {
      valid: false,
      error: 'Fichier corrompu ou type usurpé (magic bytes invalides)',
      normalizedType,
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Erreur lors de la lecture du fichier',
      normalizedType,
    }
  }
}
