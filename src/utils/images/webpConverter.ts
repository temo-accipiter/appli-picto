// src/utils/images/webpConverter.ts
// Conversion WebP moderne avec compression progressive ≤ 20 KB

import {
  TARGET_MAX_UI_SIZE_KB,
  FALLBACK_MAX_UI_SIZE_KB,
  TARGET_DIMENSION,
} from '@/utils/images/config'

export interface ConversionOptions {
  targetSizeKB?: number
  fallbackSizeKB?: number
  maxDimension?: number
}

interface CompressionStrategy {
  dimension: number
  quality: number
}

interface ImageDimensions {
  width: number
  height: number
}

/**
 * Convertit une image en WebP avec compression progressive
 * Objectif : ≤ 20 KB, dimensions 192×192px (mobile-first TSA)
 *
 * Stratégies progressives :
 * 1. Tenter 192px @ qualités décroissantes (0.85 → 0.55)
 * 2. Réduire dimensions si nécessaire (160px, 128px, 96px)
 * 3. Fallback 30 KB si 20 KB impossible
 *
 * @param file - Fichier image original
 * @param options - Options compression
 * @param options.targetSizeKB - Taille cible en KB (défaut: 20)
 * @param options.fallbackSizeKB - Taille fallback si échec (défaut: 30)
 * @param options.maxDimension - Dimension max en px (défaut: 192)
 * @returns Fichier WebP compressé ou null si échec
 *
 * @example
 * const webpFile = await convertToWebP(pngFile)
 * if (!webpFile) {
 *   console.error('Compression échouée')
 * }
 */
export async function convertToWebP(
  file: File,
  options: ConversionOptions = {}
): Promise<File | null> {
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
      img.src = e.target?.result as string
    }

    img.onload = () => {
      console.log(
        `🔄 Compression WebP : ${file.size} bytes (cible : ${targetSizeKB} KB)`
      )

      // ─────────────────────────────────────────────────────────────
      // Stratégies de compression progressives
      // ─────────────────────────────────────────────────────────────
      const strategies: CompressionStrategy[] = [
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

      const tryCompression = async (
        strategyIndex: number = 0
      ): Promise<void> => {
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

        if (!ctx) {
          resolve(null)
          return
        }

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
 * @param file - Fichier à hasher
 * @returns Hash SHA-256 en hexadécimal (64 caractères)
 *
 * @example
 * const hash = await calculateFileHash(file)
 * // hash = "3a5b2c1d..." (64 chars)
 */
export async function calculateFileHash(file: File): Promise<string> {
  // Fallback pour environnements tests (jsdom n'a pas arrayBuffer())
  let arrayBuffer: ArrayBuffer
  if (typeof file.arrayBuffer === 'function') {
    arrayBuffer = await file.arrayBuffer()
  } else {
    // Fallback FileReader pour tests
    arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
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
 * @param file - Fichier image
 * @returns Promise<ImageDimensions>
 *
 * @example
 * const { width, height } = await getImageDimensions(file)
 * console.log(`Image : ${width}×${height}px`)
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = e => {
      img.src = e.target?.result as string
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
