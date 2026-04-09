// src/utils/storage/uploadBankCardImage.ts
// Upload dédié cartes de banque (admin-only) avec conversion JPEG réelle + path strict

import { supabase } from '@/utils/supabaseClient'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/utils/images/config'
import { convertToJpeg } from '@/utils/images/convertToJpeg'
import { buildBankCardImagePath } from '@/utils/storage/pathBuilders'

export { buildBankCardImagePath }

export interface UploadBankCardImageResult {
  path: string | null
  error: Error | null
}

export interface UploadBankCardImageOptions {
  cardId: string
}

/**
 * Upload dédié cartes de banque (admin-only)
 * - Conversion JPEG réelle (pas juste renommage)
 * - Path strict: bank-images/{cardId}.jpg (flat, pas de sous-dossiers)
 * - cardId obligatoire (UUID v4)
 * - Vérification admin via Storage policies (is_admin())
 *
 * Storage policies bank-images :
 * - SELECT : public (anon + authenticated)
 * - INSERT/UPDATE/DELETE : admin-only (is_admin())
 * - Format : {uuid}.jpg (regex ^[0-9A-Fa-f-]{36}\.[A-Za-z0-9]+$)
 */
export async function uploadBankCardImage(
  file: File | null | undefined,
  { cardId }: UploadBankCardImageOptions
): Promise<UploadBankCardImageResult> {
  // Validations
  if (!file) {
    return { path: null, error: new Error('Aucun fichier fourni') }
  }

  if (!cardId) {
    return { path: null, error: new Error('cardId requis') }
  }

  // Détection/normalisation du type
  const rawType = (file.type || 'application/octet-stream').toLowerCase()
  const type = rawType === 'image/jpg' ? 'image/jpeg' : rawType

  // Garde-fous
  const size = file.size ?? 0
  if (size <= 0) {
    return { path: null, error: new Error('Fichier vide') }
  }

  if (size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))
    return {
      path: null,
      error: new Error(`Fichier trop volumineux (>${mb} Mo)`),
    }
  }

  if (!ALLOWED_MIME_TYPES.includes(type)) {
    return {
      path: null,
      error: new Error(`Type non supporté: ${type}`),
    }
  }

  // Vérifier session auth AVANT conversion
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      path: null,
      error: new Error('Utilisateur non authentifié'),
    }
  }

  try {
    // Conversion JPEG réelle (pas juste renommage)
    const jpegBlob = await convertToJpeg(file)

    // Path strict contractuel (flat)
    const path = buildBankCardImagePath(cardId)

    // Upload vers Storage
    // ✅ Storage policy INSERT vérifie is_admin() côté serveur
    const { data, error } = await supabase.storage
      .from('bank-images')
      .upload(path, jpegBlob, {
        cacheControl: '3600',
        upsert: false, // ✅ Bloque si déjà existe (évite écrasement accidentel)
        contentType: 'image/jpeg', // JPEG réel
      })

    if (error) {
      console.error('❌ [uploadBankCardImage] Erreur Storage:')
      console.error('   • Message:', error.message)
      console.error(
        '   • Status:',
        (error as unknown as Record<string, unknown>).statusCode || 'N/A'
      )
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return { path: null, error }
    }

    return { path: data.path, error: null }
  } catch (error) {
    console.error('❌ [uploadBankCardImage] Erreur conversion/upload:', error)
    return {
      path: null,
      error: error instanceof Error ? error : new Error('Erreur inconnue'),
    }
  }
}
