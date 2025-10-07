// src/utils/storage/getSignedUrl.js
// Génère et met en cache une URL signée (temporaire) pour lire un objet Storage (bucket privé).
// - getSignedImageUrl(path, { bucket='images', expiresIn=3600, forceRefresh=false })
// - invalidateSignedImageUrl(path, bucket) pour purger le cache (ex: après remplacement d'image)

import { supabase } from '@/utils/supabaseClient'

// Cache en mémoire: clé `${bucket}/${path}` → { url, exp: timestamp_ms }
const signedUrlCache = new Map()

export async function getSignedImageUrl(
  path,
  { bucket = 'images', expiresIn = 3600, forceRefresh = false } = {}
) {
  if (!path) return { url: null, error: new Error('Chemin requis') }
  const key = `${bucket}/${path}`
  const now = Date.now()

  // Hit cache si non expiré et pas de forceRefresh
  const cached = signedUrlCache.get(key)
  if (!forceRefresh && cached && cached.exp > now) {
    return { url: cached.url, error: null }
  }

  try {
    // marge de sécurité : on rogne 30s au TTL pour limiter les 401 proches de l'expiration
    const safeExpires = Math.max(30, expiresIn - 30)

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, safeExpires)

    if (error || !data?.signedUrl) {
      return {
        url: null,
        error: error || new Error('Échec création URL signée'),
      }
    }

    const url = data.signedUrl
    signedUrlCache.set(key, { url, exp: now + safeExpires * 1000 })
    return { url, error: null }
  } catch (e) {
    return { url: null, error: e }
  }
}

export function invalidateSignedImageUrl(path, bucket = 'images') {
  if (!path) return
  const key = `${bucket}/${path}`
  signedUrlCache.delete(key)
}
