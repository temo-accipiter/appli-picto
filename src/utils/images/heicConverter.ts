// src/utils/images/heicConverter.ts
// Conversion HEIC (iPhone) → JPEG pour compatibilité navigateur

import heic2any from 'heic2any'

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

  try {
    console.log('🔄 Conversion HEIC → JPEG...')

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

    console.log(`✅ HEIC converti : ${file.size} → ${convertedFile.size} bytes`)
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
