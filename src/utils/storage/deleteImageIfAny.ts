/** Helper de storage :
 *
 * Comportement selon le bucket :
 *
 * 1. Bucket "personal-images" (cartes personnelles) :
 *    - Suppression RÉELLE du fichier Storage
 *    - Path strict: {accountId}/cards/{cardId}.jpg
 *    - AUCUNE déduplication → safe de supprimer
 *
 * 2. Autres buckets (legacy avec déduplication) :
 *    - Soft-delete uniquement (fichier conservé)
 *    - Raison : Déduplication SHA-256, plusieurs entités peuvent partager le même fichier
 *    - Solution : Soft-delete dans user_assets (deleted_at) suffit
 */

import { supabase } from '@/utils/supabaseClient'

interface DeleteImageResult {
  deleted: boolean
  skipped: boolean
  error?: Error
}

export default async function deleteImageIfAny(
  imagePath: string | null | undefined,
  bucket: string = 'images' // Default legacy bucket
): Promise<DeleteImageResult> {
  if (!imagePath) return { deleted: false, skipped: true }

  // 🆕 Cartes personnelles : VRAIE suppression (pas de déduplication)
  if (bucket === 'personal-images') {
    try {
      const { error } = await supabase.storage
        .from('personal-images')
        .remove([imagePath])

      if (error) {
        console.error('❌ [deleteImageIfAny] Erreur suppression:', error)
        return { deleted: false, skipped: false, error: error as Error }
      }

      return { deleted: true, skipped: false }
    } catch (e) {
      console.error('❌ [deleteImageIfAny] Exception:', e)
      return { deleted: false, skipped: false, error: e as Error }
    }
  }

  // Legacy buckets avec déduplication : Soft-delete uniquement
  return { deleted: true, skipped: true }
}
