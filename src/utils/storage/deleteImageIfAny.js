/** Helper de storage :
 * NE supprime PLUS physiquement les images du Storage (déduplication).
 * Les fichiers restent dans Storage même après suppression de tâche/récompense.
 * Raison : Avec la déduplication SHA-256, plusieurs tâches peuvent partager
 * le même fichier. Supprimer le fichier casserait les autres références.
 *
 * Solution : Soft-delete dans user_assets (deleted_at) suffit.
 * Un cleanup périodique peut supprimer les fichiers orphelins plus tard.
 *
 * Retourne toujours { deleted: true, skipped: true } pour compatibilité.
 */

import { supabase } from '@/utils/supabaseClient'

export default async function deleteImageIfAny(imagePath) {
  if (!imagePath) return { deleted: false, skipped: true }

  // ⚠️ NE PAS SUPPRIMER du Storage (déduplication)
  // Le fichier peut être utilisé par d'autres tâches/récompenses
  console.log('ℹ️ Soft-delete uniquement (fichier conservé):', imagePath)

  return { deleted: true, skipped: true }

  // 💡 Ancien code (désactivé pour déduplication) :
  // try {
  //   const { error } = await supabase.storage.from('images').remove([imagePath])
  //   if (error) return { deleted: false, error }
  //   return { deleted: true }
  // } catch (e) {
  //   return { deleted: false, error: e }
  // }
}
