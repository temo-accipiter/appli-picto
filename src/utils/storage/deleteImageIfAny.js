/** Helper de storage :
 * supprime une image du bucket "images" si un chemin est fourni
 * Supprime une image dans le bucket "images" si un chemin est fourni.
 * Retourne { deleted: boolean, skipped?: boolean, error?: any }
 */

import { supabase } from '@/utils/supabaseClient'

export default async function deleteImageIfAny(imagePath) {
  if (!imagePath) return { deleted: false, skipped: true }
  try {
    const { error } = await supabase.storage.from('images').remove([imagePath])
    if (error) return { deleted: false, error }
    return { deleted: true }
  } catch (e) {
    return { deleted: false, error: e }
  }
}
