// src/utils/storage/uploadImage.ts
// Upload vers un bucket privé (Storage). Retourne le chemin et peut signer immédiatement si demandé.
// - uploadImage(file, { userId, bucket='images', prefix='misc', upsert=false, contentType, sign=false, expiresIn=3600 })
//   -> { path, url, error }

import { supabase } from '@/utils/supabaseClient'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/utils/images/config'
import { getSignedImageUrl } from '@/utils/storage/getSignedUrl'

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

/** Sanitize basique du nom de fichier (ASCII + tirets) */
export function sanitizeFileName(name: string = ''): string {
  const base = String(name).split('/').pop()?.split('\\').pop() || ''
  // src/utils/storage/uploadImage.ts
  const lastDotIndex = base.lastIndexOf('.')
  const [raw, ext = ''] =
    lastDotIndex >= 0
      ? [base.slice(0, lastDotIndex), base.slice(lastDotIndex + 1)]
      : [base, '']

  const safeBase = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return safeExt ? `${safeBase}.${safeExt}` : safeBase
}

/** Construit un chemin scoping par user, avec préfixe (ex: taches, recompenses) */
export function buildScopedPath(
  userId: string,
  fileName: string,
  prefix: string = 'misc'
): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const rnd = Math.random().toString(36).slice(2, 8)
  const safe = sanitizeFileName(fileName)
  return `${userId}/${prefix}/${y}/${m}/${day}/${Date.now()}-${rnd}-${safe}`
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

  // Chemin final
  const nameGuess = file.name || `upload.${type.split('/')[1] || 'bin'}`
  const path = buildScopedPath(userId, nameGuess, prefix)

  // Upload
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert,
      contentType: type,
    })

  if (error) {
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
