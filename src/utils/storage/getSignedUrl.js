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

    if (import.meta.env.DEV && bucket === 'avatars') {
      console.log('🔍 getSignedImageUrl - Tentative signature', {
        bucket,
        path,
        key,
        forceRefresh,
      })
    }

    // WORKAROUND: Pour le bucket avatars, utiliser download() au lieu de createSignedUrl()
    // car createSignedUrl() timeout (bug SDK ou config serveur)
    if (bucket === 'avatars') {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(path)

      if (import.meta.env.DEV) {
        console.log('🔍 getSignedImageUrl - Download blob', {
          bucket,
          path,
          hasBlob: !!blob,
          downloadError,
        })
      }

      if (downloadError || !blob) {
        return {
          url: null,
          error: downloadError || new Error('Échec téléchargement image'),
        }
      }

      // Créer une Object URL locale à partir du blob
      const url = URL.createObjectURL(blob)
      // Pas d'expiration pour les Object URLs, elles restent valides tant que la page est ouverte
      signedUrlCache.set(key, { url, exp: now + 24 * 3600 * 1000 })
      return { url, error: null }
    }

    // Pour les autres buckets, utiliser createSignedUrl() normalement
    // Timeout de 5 secondes pour éviter de pendre indéfiniment
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout création URL signée')), 5000)
    )

    const signedUrlPromise = supabase.storage
      .from(bucket)
      .createSignedUrl(path, safeExpires)

    const { data, error } = await Promise.race([
      signedUrlPromise,
      timeoutPromise,
    ]).catch(e => ({ data: null, error: e }))

    if (import.meta.env.DEV && bucket === 'avatars') {
      console.log('🔍 getSignedImageUrl - Résultat signature', {
        bucket,
        path,
        hasSignedUrl: !!data?.signedUrl,
        error,
      })
    }

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
    if (import.meta.env.DEV && bucket === 'avatars') {
      console.error('🔍 getSignedImageUrl - Exception', { bucket, path, e })
    }
    return { url: null, error: e }
  }
}

export function invalidateSignedImageUrl(path, bucket = 'images') {
  if (!path) return
  const key = `${bucket}/${path}`
  signedUrlCache.delete(key)
}
