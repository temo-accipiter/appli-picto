/** Helper de storage :
 * Remplace une image existante par une nouvelle :
 * - Supprime l'ancienne si fournie
 * - Upload la nouvelle
 * Retourne { path, url, error }
 */

import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
import { uploadImage } from '@/utils/storage/uploadImage'

export default async function replaceImageIfAny(
  oldPath,
  file,
  { userId, prefix }
) {
  if (!file) return { path: oldPath || null, url: null, error: null }

  if (oldPath) {
    // best-effort: on tente de supprimer, mais on n'empêche pas l'upload en cas d'erreur
    const { error: delErr } = await deleteImageIfAny(oldPath)
    if (delErr) {
      console.warn('⚠️ Erreur suppression ancienne image:', delErr)
    }
  }

  return await uploadImage(file, { userId, prefix })
}
