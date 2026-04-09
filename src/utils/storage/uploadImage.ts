// src/utils/storage/uploadImage.ts
// Upload vers un bucket privé (Storage). Retourne le chemin et peut signer immédiatement si demandé.
// - uploadImage(file, { userId, bucket='images', prefix='misc', upsert=false, contentType, sign=false, expiresIn=3600 })
//   -> { path, url, error }

import { supabase } from '@/utils/supabaseClient'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/utils/images/config'
import { getSignedImageUrl } from '@/utils/storage/getSignedUrl'
import {
  sanitizeFileName,
  buildRLSPath,
  buildScopedPath,
} from '@/utils/storage/pathBuilders'

export { sanitizeFileName, buildRLSPath, buildScopedPath }

export interface UploadResult {
  path: string | null
  url: string | null
  error: Error | null
}

export interface UploadOptions {
  userId: string
  bucket?: string
  prefix?: string
  upsert?: boolean
  contentType?: string
  sign?: boolean
  expiresIn?: number
}

/**
 * Upload d'image vers un bucket privé. Ne publie pas d'URL publique.
 * Option `sign: true` pour obtenir une URL signée immédiatement.
 */
export async function uploadImage(
  file: File | null | undefined,
  {
    userId,
    bucket = 'images',
    prefix = 'misc',
    upsert = false,
    contentType,
    sign = false,
    expiresIn = 3600,
  }: Partial<UploadOptions> = {}
): Promise<UploadResult> {
  if (!file)
    return { path: null, url: null, error: new Error('Aucun fichier fourni') }
  if (!userId)
    return { path: null, url: null, error: new Error('userId requis') }

  // Détection/normalisation du type
  const rawType = (
    contentType ||
    file.type ||
    'application/octet-stream'
  ).toLowerCase()
  const type = rawType === 'image/jpg' ? 'image/jpeg' : rawType

  // Garde-fous
  const size = file.size ?? 0
  if (size <= 0)
    return { path: null, url: null, error: new Error('Fichier vide') }
  if (size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))
    return {
      path: null,
      url: null,
      error: new Error(`Fichier trop volumineux (>${mb} Mo)`),
    }
  }
  if (!ALLOWED_MIME_TYPES.includes(type)) {
    return {
      path: null,
      url: null,
      error: new Error(`Type non supporté: ${type}`),
    }
  }

  // Vérifier session auth AVANT génération chemin (RLS policy nécessite auth.uid())
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      path: null,
      url: null,
      error: new Error('Utilisateur non authentifié'),
    }
  }

  // CRITIQUE : Utiliser session.user.id (= auth.uid() dans RLS) pour le chemin
  // La RLS policy vérifie: foldername[1]=auth.uid(), foldername[2]=subfolder, split_part(3)=UUID.jpg
  const authenticatedUserId = session.user.id

  // Chemin final - Utiliser authenticatedUserId pour garantir correspondance RLS
  const nameGuess = file.name || `upload.${type.split('/')[1] || 'bin'}`
  const path =
    bucket === 'personal-images'
      ? buildRLSPath(authenticatedUserId, nameGuess) // ✅ session.user.id
      : buildScopedPath(authenticatedUserId, nameGuess, prefix)


  // Upload
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert,
      contentType: type,
    })

  if (error) {
    console.error('❌ [uploadImage] Erreur Storage:')
    console.error('   • Message:', error.message)
    console.error(
      '   • Status:',
      (error as unknown as Record<string, unknown>).statusCode || 'N/A'
    )
    console.error('   • Error object:', JSON.stringify(error, null, 2))
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return { path: null, url: null, error }
  }


  // Buckets privés : pas d'URL publique. On peut signer si demandé.
  if (sign) {
    const { url, error: signErr } = await getSignedImageUrl(data.path, {
      bucket,
      expiresIn,
    })
    if (signErr) return { path: data.path, url: null, error: signErr }
    return { path: data.path, url, error: null }
  }

  return { path: data.path, url: null, error: null }
}
