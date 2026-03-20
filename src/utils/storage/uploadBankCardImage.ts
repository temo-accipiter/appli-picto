// src/utils/storage/uploadBankCardImage.ts
// Upload dédié cartes de banque (admin-only) avec conversion JPEG réelle + path strict

import { supabase } from '@/utils/supabaseClient'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/utils/images/config'

export interface UploadBankCardImageResult {
  path: string | null
  error: Error | null
}

export interface UploadBankCardImageOptions {
  cardId: string
}

/**
 * Construit le path strict contractuel pour une carte de banque
 * Format: {cardId}.jpg (flat, pas de sous-dossiers)
 * Storage policies : name ~ '^[0-9A-Fa-f-]{36}\.[A-Za-z0-9]+$' (UUID.ext)
 */
export function buildBankCardImagePath(cardId: string): string {
  return `${cardId}.jpg`
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
    console.log('🔄 [uploadBankCardImage] Conversion en JPEG réel...')
    const jpegBlob = await convertToJpeg(file)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📤 [uploadBankCardImage] Upload carte banque:')
    console.log('   • Bucket: bank-images (public read)')
    console.log('   • Card ID:', cardId)
    console.log('   • Type original:', type)
    console.log('   • Type final: image/jpeg (conversion réelle)')
    console.log('   • Taille JPEG:', (jpegBlob.size / 1024).toFixed(2), 'Ko')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Path strict contractuel (flat)
    const path = buildBankCardImagePath(cardId)

    console.log('   • Path strict:', path)
    console.log('   • Format: {cardId}.jpg (flat) ✅')

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
      console.error('   • Status:', error.statusCode || 'N/A')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return { path: null, error }
    }

    console.log('✅ [uploadBankCardImage] Upload réussi!')
    console.log('   • Path final:', data.path)
    console.log('   • URL publique: bucket public (lecture autorisée)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return { path: data.path, error: null }
  } catch (error) {
    console.error('❌ [uploadBankCardImage] Erreur conversion/upload:', error)
    return {
      path: null,
      error: error instanceof Error ? error : new Error('Erreur inconnue'),
    }
  }
}
