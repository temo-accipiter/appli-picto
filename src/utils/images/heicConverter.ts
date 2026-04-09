// src/utils/images/heicConverter.ts
// Conversion HEIC (iPhone) → JPEG pour compatibilité navigateur

// Import dynamique pour éviter "window is not defined" en SSR Next.js
type Heic2AnyFunction = (options: {
  blob: Blob
  toType: string
  quality: number
}) => Promise<Blob | Blob[]>

let heic2anyLib: Heic2AnyFunction | null = null

/**
 * Charge heic2any de manière dynamique (client-side uniquement)
 */
async function loadHeic2any() {
  if (!heic2anyLib && typeof window !== 'undefined') {
    heic2anyLib = (await import('heic2any')).default
  }
  return heic2anyLib
}

/**
 * Convertit un fichier HEIC (iPhone) en JPEG
 *
 * @param file - Fichier HEIC original
 * @returns Fichier JPEG converti
 * @throws Error - Si la conversion échoue
 *
 * @example
 * const jpegFile = await convertHEICtoJPEG(heicFile)
 */
export async function convertHEICtoJPEG(file: File): Promise<File> {
  if (!isHEIC(file)) {
    return file // Pas HEIC → retour tel quel
  }

  // Charger heic2any dynamiquement (client-side uniquement)
  const heic2any = await loadHeic2any()

  if (!heic2any) {
    throw new Error('heic2any non disponible (exécution côté serveur)')
  }

  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95, // Haute qualité (compression WebP sera faite après)
    })

    // Gérer cas où heic2any retourne Array de Blobs (multi-page HEIC)
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob

    if (!blob) {
      throw new Error('Conversion HEIC failed: no blob returned')
    }

    const convertedFile = new File(
      [blob],
      file.name.replace(/\.heic$/i, '.jpg'),
      {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }
    )

    return convertedFile
  } catch (error) {
    console.error('❌ Erreur conversion HEIC:', error)
    throw new Error(
      "Impossible de convertir l'image HEIC. Essayez de la convertir en JPEG depuis votre téléphone."
    )
  }
}

/**
 * Détecte si un fichier est au format HEIC/HEIF
 *
 * @param file - Fichier à vérifier
 * @returns true si HEIC/HEIF
 *
 * @example
 * if (isHEIC(file)) {
 *   file = await convertHEICtoJPEG(file)
 * }
 */
export function isHEIC(file: File): boolean {
  const type = file.type?.toLowerCase()
  const name = file.name?.toLowerCase()

  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}
