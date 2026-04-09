// src/utils/storage/uploadCardImage.ts
// Upload dédié cartes personnelles avec conversion JPEG réelle + path strict

import { supabase } from '@/utils/supabaseClient'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/utils/images/config'
import { convertToJpeg } from '@/utils/images/convertToJpeg'
import { buildCardImagePath } from '@/utils/storage/pathBuilders'

export { buildCardImagePath }

export interface UploadCardImageResult {
  path: string | null
  error: Error | null
}

export interface UploadCardImageOptions {
  accountId: string
  cardId: string
}

/**
 * Upload dédié cartes personnelles
 * - Conversion JPEG réelle (pas juste renommage)
 * - Path strict: personal-images/{accountId}/cards/{cardId}.jpg
 * - cardId obligatoire
 * - Aucun fallback legacy
 */
export async function uploadCardImage(
  file: File | null | undefined,
  { accountId, cardId }: UploadCardImageOptions
): Promise<UploadCardImageResult> {
  // Validations
  if (!file) {
    return { path: null, error: new Error('Aucun fichier fourni') }
  }

  if (!accountId) {
    return { path: null, error: new Error('accountId requis') }
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

  // Vérifier que accountId correspond à l'utilisateur authentifié
  if (session.user.id !== accountId) {
    return {
      path: null,
      error: new Error("accountId ne correspond pas à l'utilisateur"),
    }
  }

  try {
    // Conversion JPEG réelle (pas juste renommage)
    const jpegBlob = await convertToJpeg(file)


    // Path strict contractuel
    const path = buildCardImagePath(accountId, cardId)


    // Upload vers Storage
    const { data, error } = await supabase.storage
      .from('personal-images')
      .upload(path, jpegBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg', // JPEG réel
      })

    if (error) {
      console.error('❌ [uploadCardImage] Erreur Storage:')
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
    console.error('❌ [uploadCardImage] Erreur conversion/upload:', error)
    return {
      path: null,
      error: error instanceof Error ? error : new Error('Erreur inconnue'),
    }
  }
}
