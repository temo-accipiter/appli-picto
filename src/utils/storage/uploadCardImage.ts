// src/utils/storage/uploadCardImage.ts
// Upload dédié cartes personnelles avec conversion JPEG réelle + path strict

import { supabase } from '@/utils/supabaseClient'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/utils/images/config'

export interface UploadCardImageResult {
  path: string | null
  error: Error | null
}

export interface UploadCardImageOptions {
  accountId: string
  cardId: string
}

/**
 * Construit le path strict contractuel pour une carte personnelle
 * Format: {accountId}/cards/{cardId}.jpg
 */
export function buildCardImagePath(accountId: string, cardId: string): string {
  return `${accountId}/cards/${cardId}.jpg`
}

/**
 * Convertit une image en vrai JPEG (pas juste renommer)
 * Retourne un Blob JPEG avec contentType correct
 */
async function convertToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Impossible de créer le contexte canvas'))
      return
    }

    img.onload = () => {
      // Conserver dimensions originales (compression gérée en amont)
      canvas.width = img.width
      canvas.height = img.height

      // Dessiner sur canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      // Convertir en JPEG réel (qualité 0.92)
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Échec conversion JPEG'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        0.92
      )
    }

    img.onerror = () => {
      reject(new Error("Impossible de charger l'image pour conversion"))
    }

    // Charger depuis File
    img.src = URL.createObjectURL(file)
  })
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
