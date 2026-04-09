// src/utils/images/convertToJpeg.ts
// Conversion canvas JPEG — source unique de vérité

/**
 * Convertit une image en vrai JPEG via canvas (pas juste renommer)
 * Retourne un Blob JPEG avec contentType correct
 * Qualité 0.92 — dimensions originales conservées
 */
export async function convertToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Impossible de créer le contexte canvas'))
      return
    }

    img.onload = () => {
      // Conserver dimensions originales (compression gérée en amont)
      canvas.width = img.width
      canvas.height = img.height

      // Dessiner sur canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      // Convertir en JPEG réel (qualité 0.92)
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Échec conversion JPEG'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        0.92
      )
    }

    img.onerror = () => {
      reject(new Error("Impossible de charger l'image pour conversion"))
    }

    // Charger depuis File
    img.src = URL.createObjectURL(file)
  })
}
