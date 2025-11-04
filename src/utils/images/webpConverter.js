// src/utils/images/webpConverter.js
// Conversion WebP moderne avec compression progressive ≤ 20 KB

import {
  TARGET_MAX_UI_SIZE_KB,
  FALLBACK_MAX_UI_SIZE_KB,
  TARGET_DIMENSION,
} from '@/utils/images/config'

/**
 * Convertit une image en WebP avec compression progressive
 * Objectif : ≤ 20 KB, dimensions 192×192px (mobile-first TSA)
 *
 * Stratégies progressives :
 * 1. Tenter 192px @ qualités décroissantes (0.85 → 0.55)
 * 2. Réduire dimensions si nécessaire (160px, 128px, 96px)
 * 3. Fallback 30 KB si 20 KB impossible
 *
 * @param {File} file - Fichier image original
 * @param {Object} options - Options compression
 * @param {number} [options.targetSizeKB=20] - Taille cible en KB
 * @param {number} [options.fallbackSizeKB=30] - Taille fallback si échec
 * @param {number} [options.maxDimension=192] - Dimension max (px)
 * @returns {Promise<File|null>} - Fichier WebP compressé ou null si échec
 *
 * @example
 * const webpFile = await convertToWebP(pngFile)
 * if (!webpFile) {
 *   console.error('Compression échouée')
 * }
 */
export async function convertToWebP(file, options = {}) {
  const {
    targetSizeKB = TARGET_MAX_UI_SIZE_KB,
    fallbackSizeKB = FALLBACK_MAX_UI_SIZE_KB,
    maxDimension: _maxDimension = TARGET_DIMENSION,
  } = options

  // ─────────────────────────────────────────────────────────────
  // SVG : pas de conversion (vecteur)
  // ─────────────────────────────────────────────────────────────
  if (file.type === 'image/svg+xml') {
    console.log('ℹ️ SVG détecté → aucune conversion')
    return file
  }

  // ─────────────────────────────────────────────────────────────
  // Déjà ≤ 20 KB ? → retour tel quel
  // ─────────────────────────────────────────────────────────────
  if (file.size <= targetSizeKB * 1024) {
    console.log(`ℹ️ Fichier déjà ≤ ${targetSizeKB} KB → aucune compression`)
    return file
  }

  return new Promise(resolve => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = e => {
      img.src = e.target.result
    }

    img.onload = () => {
      console.log(
        `🔄 Compression WebP : ${file.size} bytes (cible : ${targetSizeKB} KB)`
      )

      // ─────────────────────────────────────────────────────────────
      // Stratégies de compression progressives
      // ─────────────────────────────────────────────────────────────
      const strategies = [
        // Tentative 192px @ qualités décroissantes
        { dimension: 192, quality: 0.85 },
        { dimension: 192, quality: 0.75 },
        { dimension: 192, quality: 0.65 },
        { dimension: 192, quality: 0.55 },

        // Réduction dimensions si nécessaire
        { dimension: 160, quality: 0.75 },
        { dimension: 160, quality: 0.6 },
        { dimension: 128, quality: 0.7 },
        { dimension: 128, quality: 0.5 },

        // Dernier recours (ultra-compressé)
        { dimension: 96, quality: 0.6 },
      ]

      let currentTargetKB = targetSizeKB

      const tryCompression = async (strategyIndex = 0) => {
        if (strategyIndex >= strategies.length) {
          // ─────────────────────────────────────────────────────────────
          // Échec total → essayer avec fallback 30 KB
          // ─────────────────────────────────────────────────────────────
          if (
            currentTargetKB === targetSizeKB &&
            fallbackSizeKB > targetSizeKB
          ) {
            console.warn(
              `⚠️ Impossible ≤ ${targetSizeKB} KB → fallback ${fallbackSizeKB} KB`
            )
            currentTargetKB = fallbackSizeKB
            tryCompression(0) // Restart avec nouvelle cible
            return
          }

          console.error('❌ Compression échouée (toutes stratégies épuisées)')
          resolve(null)
          return
        }

        const strategy = strategies[strategyIndex]
        const canvas = document.createElement('canvas')

        // ─────────────────────────────────────────────────────────────
        // Calcul dimensions (respecter ratio)
        // ─────────────────────────────────────────────────────────────
        let { width, height } = img
        if (width > strategy.dimension || height > strategy.dimension) {
          const ratio = Math.min(
            strategy.dimension / width,
            strategy.dimension / height
          )
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        // Améliorer qualité rendu
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          blob => {
            if (!blob) {
              tryCompression(strategyIndex + 1)
              return
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.\w+$/, '.webp'),
              {
                type: 'image/webp',
                lastModified: Date.now(),
              }
            )

            if (compressedFile.size <= currentTargetKB * 1024) {
              const compressionRatio = (
                ((file.size - compressedFile.size) / file.size) *
                100
              ).toFixed(1)

              console.log(
                `✅ WebP compressé : ${compressedFile.size} bytes (${width}×${height}, qualité ${strategy.quality}, -${compressionRatio}%)`
              )

              resolve(compressedFile)
            } else {
              // Taille encore trop grande → stratégie suivante
              tryCompression(strategyIndex + 1)
            }
          },
          'image/webp',
          strategy.quality
        )
      }

      tryCompression(0)
    }

    img.onerror = () => {
      console.error('❌ Erreur chargement image pour conversion')
      resolve(null)
    }

    reader.onerror = () => {
      console.error('❌ Erreur lecture fichier')
      resolve(null)
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Calcule le hash SHA-256 d'un fichier (déduplication)
 *
 * @param {File} file - Fichier à hasher
 * @returns {Promise<string>} - Hash SHA-256 en hexadécimal (64 caractères)
 *
 * @example
 * const hash = await calculateFileHash(file)
 * // hash = "3a5b2c1d..." (64 chars)
 */
export async function calculateFileHash(file) {
  // Fallback pour environnements tests (jsdom n'a pas arrayBuffer())
  let arrayBuffer
  if (typeof file.arrayBuffer === 'function') {
    arrayBuffer = await file.arrayBuffer()
  } else {
    // Fallback FileReader pour tests
    arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  console.log(`🔑 Hash SHA-256 calculé : ${hash.slice(0, 16)}...`)
  return hash
}

/**
 * Extrait dimensions d'une image
 *
 * @param {File} file - Fichier image
 * @returns {Promise<{width: number, height: number}>}
 *
 * @example
 * const { width, height } = await getImageDimensions(file)
 * console.log(`Image : ${width}×${height}px`)
 */
export async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = e => {
      img.src = e.target.result
    }

    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      reject(new Error('Impossible de lire les dimensions'))
    }

    reader.onerror = () => {
      reject(new Error('Erreur lecture fichier'))
    }

    reader.readAsDataURL(file)
  })
}
