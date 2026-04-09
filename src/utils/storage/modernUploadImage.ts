// src/utils/storage/modernUploadImage.ts
// Upload moderne images privées Supabase Storage
// Pipeline : HEIC → WebP → Hash → Dédup → Quota → Upload → Metrics

import { supabase } from '@/utils/supabaseClient'
import { validateImageFile } from '@/utils/images/imageValidator'
import { convertHEICtoJPEG, isHEIC } from '@/utils/images/heicConverter'
import {
  convertToWebP,
  calculateFileHash,
  getImageDimensions,
} from '@/utils/images/webpConverter'
import { uploadWithRetry } from '@/utils/upload/uploadWithRetry'
import {
  TARGET_MAX_UI_SIZE_KB,
  PRIVATE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from '@/utils/images/config'
import { buildScopedPath, sanitizeFileName } from '@/utils/storage/uploadImage'
import { invalidateImageCache } from '@/utils/serviceWorker/register'
import { ensureValidSession } from '../auth/ensureValidSession'

export type AssetType = 'task_image' | 'reward_image' | 'card_image'
export type ConversionMethod =
  | 'none'
  | 'heic_to_jpeg_then_webp'
  | 'heic_to_jpeg_only'
  | 'fallback_original'
  | 'client_webp'
  | 'svg_unchanged'

export interface UploadMetrics {
  originalSize: number
  compressedSize: number
  conversionMs: number | null
  uploadMs: number | null
  result: 'success' | 'failed' | 'fallback_original'
  errorMessage: string | null
  mimeTypeOriginal: string
  mimeTypeFinal: string
  conversionMethod: ConversionMethod
}

export interface ProgressInfo {
  step: string
  progress: number
  message?: string
}

export interface ModernUploadOptions {
  userId: string
  assetType?: AssetType
  prefix?: string
  onProgress?: ((info: ProgressInfo) => void) | null | undefined
}

export interface UploadResult {
  path: string | null
  url: string | null
  assetId: string | null
  width: number | null
  height: number | null
  isDuplicate: boolean
  error: Error | null
  version?: number
}

interface DuplicateCheckResult {
  exists: boolean
  asset_id?: string
  file_path?: string
  width?: number
  height?: number
}

interface QuotaCheckResult {
  can_upload: boolean
  reason?: string
}

/**
 * Upload moderne d'une image privée (Supabase Storage)
 *
 * Pipeline complet :
 * 1. Validation MIME + magic bytes
 * 2. Conversion HEIC → JPEG (si iPhone)
 * 3. Conversion → WebP ≤ 20 KB (sauf SVG)
 * 4. Calcul hash SHA-256 (déduplication)
 * 5. Vérification duplication existante
 * 6. Vérification quota utilisateur
 * 7. Upload avec retry (réseau instable)
 * 8. Enregistrement user_assets + metrics
 * 9. Génération signed URL (TTL 24h)
 */
export async function modernUploadImage(
  file: File | null | undefined,
  options: ModernUploadOptions
): Promise<UploadResult> {
  const {
    userId,
    assetType = 'task_image',
    prefix = 'misc',
    onProgress = null,
  } = options

  // Métriques (monitoring)
  const metrics: UploadMetrics = {
    originalSize: file?.size || 0,
    compressedSize: file?.size || 0,
    conversionMs: null,
    uploadMs: null,
    result: 'success',
    errorMessage: null,
    mimeTypeOriginal: file?.type || '',
    mimeTypeFinal: file?.type || '',
    conversionMethod: 'none',
  }

  // Déclarer fileHash en dehors du try/catch pour qu'il soit accessible dans le catch
  let fileHash: string | undefined

  try {
    // 0️⃣ VÉRIFICATION SESSION
    try {
      await ensureValidSession({ marginMinutes: 5 })
    } catch (sessionError) {
      console.error('❌ [STEP 0] Session invalide:', sessionError)
      throw new Error(
        'Votre session a expiré. Veuillez recharger la page et réessayer.'
      )
    }

    // 1️⃣ VALIDATION ENTRÉE
    if (!file) {
      throw new Error('Aucun fichier fourni')
    }

    if (!userId) {
      throw new Error('userId requis')
    }

    if (onProgress) {
      onProgress({ step: 'validation', progress: 5 })
    }

    // 2️⃣ VALIDATION FICHIER
    const validation = await validateImageFile(file)

    if (!validation.valid) {
      throw new Error(validation.error || 'Validation échouée')
    }

    if (onProgress) {
      onProgress({ step: 'validation', progress: 10 })
    }

    // 3️⃣ CONVERSION HEIC → JPEG
    let processedFile: File = file
    const conversionStart = Date.now()

    if (isHEIC(file)) {
      processedFile = await convertHEICtoJPEG(file)
      metrics.conversionMethod = 'heic_to_jpeg_then_webp'

      if (onProgress) {
        onProgress({ step: 'heic_conversion', progress: 20 })
      }
    }

    // 4️⃣ CONVERSION → WEBP
    if (processedFile.type !== 'image/svg+xml') {
      const webpFile = await convertToWebP(processedFile, {
        targetSizeKB: TARGET_MAX_UI_SIZE_KB,
      })

      if (!webpFile) {
        if (processedFile.size <= 100 * 1024) {
          console.warn('⚠️ Compression WebP échouée → upload original')
          metrics.conversionMethod =
            metrics.conversionMethod === 'heic_to_jpeg_then_webp'
              ? 'heic_to_jpeg_only'
              : 'fallback_original'
          metrics.result = 'fallback_original'
        } else {
          throw new Error(
            'Image trop lourde et compression impossible.\nEssayez une image plus simple ou de meilleure qualité.'
          )
        }
      } else {
        processedFile = webpFile
        metrics.mimeTypeFinal = 'image/webp'

        if (metrics.conversionMethod === 'none') {
          metrics.conversionMethod = 'client_webp'
        }
      }
    } else {
      metrics.conversionMethod = 'svg_unchanged'
    }

    metrics.compressedSize = processedFile.size
    metrics.conversionMs = Date.now() - conversionStart

    if (onProgress) {
      onProgress({ step: 'compression', progress: 40 })
    }

    // 5️⃣ CALCUL HASH
    fileHash = await calculateFileHash(processedFile)

    if (onProgress) {
      onProgress({ step: 'hash', progress: 50 })
    }

    // 6️⃣ VÉRIFICATION DUPLICATION

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as unknown as any
    const { data: duplicateCheck, error: dupError } = await supabaseAny.rpc(
      'check_duplicate_image',
      {
        p_user_id: userId,
        p_sha256_hash: fileHash,
      }
    )

    if (dupError) {
      console.error('❌ [STEP 6] Erreur vérification duplication:', dupError)
    }

    const dupCheck = duplicateCheck as DuplicateCheckResult | null

    if (dupCheck?.exists) {
      const fileName = dupCheck.file_path!.split('/').pop()
      const { data: fileExists } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .list(dupCheck.file_path!.split('/').slice(0, -1).join('/'), {
          ...(fileName !== undefined && { search: fileName }),
        })

      if (fileExists && fileExists.length > 0) {
        await logMetrics(userId, assetType, metrics, fileHash)

        return {
          path: dupCheck.file_path!,
          url: null,
          assetId: dupCheck.asset_id!,
          width: dupCheck.width || null,
          height: dupCheck.height || null,
          isDuplicate: true,
          error: null,
        }
      } else {
        console.warn(
          '⚠️ Fichier supprimé du Storage → suppression asset + re-upload'
        )

        // Le champ deleted_at n'existe pas dans user_assets
        // On supprime directement l'enregistrement
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('user_assets')
          .delete()
          .eq('id', dupCheck.asset_id!)
      }
    }

    if (onProgress) {
      onProgress({ step: 'deduplication', progress: 60 })
    }

    // 7️⃣ VÉRIFICATION QUOTA
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: quotaCheck, error: quotaError } = await (supabase as any).rpc(
      'check_image_quota',
      {
        p_user_id: userId,
        p_asset_type: assetType,
        p_file_size: processedFile.size,
      }
    )

    if (quotaError) {
      console.error('❌ [STEP 7] Erreur vérification quota:', quotaError)
      throw new Error('Impossible de vérifier les quotas')
    }

    const quota = quotaCheck as QuotaCheckResult | null

    if (!quota?.can_upload) {
      const reason = quota?.reason || 'limite atteinte'

      const messages: Record<string, string> = {
        task_image_limit_reached: 'Quota de tâches atteint',
        reward_image_limit_reached: 'Quota de récompenses atteint',
        total_storage_limit_reached: "Quota total d'images atteint",
        image_too_large: 'Image trop volumineuse',
      }

      throw new Error(messages[reason] || `Quota dépassé : ${reason}`)
    }

    if (onProgress) {
      onProgress({ step: 'quota', progress: 70 })
    }

    // 8️⃣ EXTRAIRE DIMENSIONS
    const { width, height } = await getImageDimensions(processedFile)

    // 9️⃣ UPLOAD STORAGE
    const fileName = sanitizeFileName(processedFile.name)
    const storagePath = buildScopedPath(userId, fileName, prefix)

    const uploadStart = Date.now()

    const { data: storageData, error: storageError } = await uploadWithRetry(
      () =>
        supabase.storage
          .from(PRIVATE_BUCKET)
          .upload(storagePath, processedFile, {
            cacheControl: `${SIGNED_URL_TTL_SECONDS}`,
            upsert: false,
            contentType: processedFile.type,
          }),
      {
        maxRetries: 2,
        onRetry: ({ attempt }) => {
          if (onProgress) {
            onProgress({
              step: 'upload_retry',
              progress: 70 + attempt * 5,
              message: `Connexion lente, réessai ${attempt}...`,
            })
          }
        },
      }
    )

    if (storageError) {
      console.error('❌ [STEP 9] Erreur upload Supabase Storage:', storageError)
      throw storageError
    }

    metrics.uploadMs = Date.now() - uploadStart

    if (onProgress) {
      onProgress({ step: 'upload', progress: 85 })
    }

    // 🔟 ENREGISTREMENT USER_ASSETS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: asset, error: dbError } = await (supabase as any)
      .from('user_assets')
      .insert({
        user_id: userId,
        asset_type: assetType,
        file_path: storageData.path,
        file_size: processedFile.size,
        mime_type: processedFile.type,
        width,
        height,
        sha256_hash: fileHash,
        version: 1,
      })
      .select('id')
      .single()

    if (dbError) {
      // Code 23505 = duplicate hash (comportement normal, déduplication)
      if (dbError.code === '23505') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase as any)
          .from('user_assets')
          .select('id, file_path, width, height')
          .eq('user_id', userId)
          .eq('sha256_hash', fileHash)
          .single()

        if (existing) {
          await supabase.storage.from(PRIVATE_BUCKET).remove([storageData.path])

          await logMetrics(userId, assetType, metrics, fileHash)

          return {
            path: existing.file_path,
            url: null,
            assetId: existing.id,
            width: existing.width,
            height: existing.height,
            isDuplicate: true,
            error: null,
          }
        }
      }

      // Si ce n'est pas une erreur de hash en doublon, c'est une vraie erreur
      console.error('❌ [STEP 10] Erreur enregistrement BDD:', {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
      })

      await supabase.storage.from(PRIVATE_BUCKET).remove([storageData.path])

      throw dbError
    }

    if (onProgress) {
      onProgress({ step: 'database', progress: 95 })
    }

    // 1️⃣1️⃣ GÉNÉRATION SIGNED URL
    const { data: signedData, error: signError } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(storageData.path, SIGNED_URL_TTL_SECONDS)

    if (signError) {
      console.error('⚠️ Erreur génération signed URL:', signError)
    }

    // 1️⃣2️⃣ LOG METRICS
    await logMetrics(userId, assetType, metrics, fileHash)

    if (onProgress) {
      onProgress({ step: 'complete', progress: 100 })
    }

    return {
      path: storageData.path,
      url: signedData?.signedUrl || null,
      assetId: asset.id,
      width,
      height,
      isDuplicate: false,
      error: null,
    }
  } catch (error) {
    console.error('❌ Upload échoué:', error)

    metrics.result = 'failed'
    metrics.errorMessage = (error as Error).message

    try {
      await logMetrics(userId, assetType, metrics, fileHash)
    } catch (metricError) {
      console.error('⚠️ Erreur log metrics (non bloquant):', metricError)
    }

    return {
      path: null,
      url: null,
      assetId: null,
      width: null,
      height: null,
      isDuplicate: false,
      error: error as Error,
    }
  }
}

async function logMetrics(
  userId: string,
  assetType: AssetType,
  metrics: UploadMetrics,
  fileHash?: string
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('image_metrics').insert({
      user_id: userId,
      asset_type: assetType,
      original_size: metrics.originalSize,
      compressed_size: metrics.compressedSize,
      conversion_ms: metrics.conversionMs,
      upload_ms: metrics.uploadMs,
      result: metrics.result,
      error_message: metrics.errorMessage,
      mime_type_original: metrics.mimeTypeOriginal,
      mime_type_final: metrics.mimeTypeFinal,
      conversion_method: metrics.conversionMethod,
      sha256_hash: fileHash || 'unknown',
    })
  } catch (error) {
    console.error('⚠️ Erreur log metrics:', error)
  }
}

export async function replaceImage(
  assetId: string,
  newFile: File,
  options: Partial<ModernUploadOptions>
): Promise<UploadResult> {
  const { userId, onProgress } = options

  if (!userId) {
    return {
      path: null,
      url: null,
      assetId: null,
      width: null,
      height: null,
      isDuplicate: false,
      error: new Error('userId requis'),
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingAsset, error: fetchError } = await (supabase as any)
      .from('user_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingAsset) {
      throw new Error('Asset introuvable')
    }

    const uploadResult = await modernUploadImage(newFile, {
      userId,
      assetType: existingAsset.asset_type as AssetType,
      prefix:
        existingAsset.asset_type === 'task_image' ? 'taches' : 'recompenses',
      onProgress: onProgress || undefined,
    })

    if (uploadResult.error) {
      return uploadResult
    }

    // Le champ deleted_at n'existe pas dans user_assets
    // On supprime directement l'ancien enregistrement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('user_assets').delete().eq('id', assetId)

    const newVersion = (existingAsset.version || 1) + 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('user_assets')
      .update({ version: newVersion })
      .eq('id', uploadResult.assetId!)

    if (uploadResult.url) {
      await invalidateImageCache(uploadResult.url)
    }

    return {
      ...uploadResult,
      version: newVersion,
    }
  } catch (error) {
    console.error('❌ Erreur remplacement image:', error)
    return {
      path: null,
      url: null,
      assetId: null,
      width: null,
      height: null,
      isDuplicate: false,
      error: error as Error,
    }
  }
}
