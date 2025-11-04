// src/utils/storage/modernUploadImage.js
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
import { ensureValidSession } from '../auth/ensureValidSession.js'

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
 *
 * @param {File} file - Fichier image original
 * @param {Object} options - Options upload
 * @param {string} options.userId - ID utilisateur (requis)
 * @param {string} [options.assetType='task_image'] - Type asset ('task_image' | 'reward_image')
 * @param {string} [options.prefix='misc'] - Préfixe chemin ('taches', 'recompenses', 'misc')
 * @param {Function} [options.onProgress=null] - Callback progression (pour UI)
 * @returns {Promise<{path, url, assetId, width, height, isDuplicate, error}>}
 *
 * @example
 * const result = await modernUploadImage(file, {
 *   userId: user.id,
 *   assetType: 'task_image',
 *   prefix: 'taches',
 *   onProgress: ({ step, progress }) => console.log(step, progress)
 * })
 */
export async function modernUploadImage(file, options = {}) {
  const {
    userId,
    assetType = 'task_image', // 'task_image' | 'reward_image'
    prefix = 'misc', // Préfixe chemin : 'taches', 'recompenses', 'misc'
    onProgress = null, // Callback progression (pour UI)
  } = options

  // Métriques (monitoring)
  const metrics = {
    originalSize: file.size,
    compressedSize: file.size,
    conversionMs: null,
    uploadMs: null,
    result: 'success',
    errorMessage: null,
    mimeTypeOriginal: file.type,
    mimeTypeFinal: file.type,
    conversionMethod: 'none',
  }

  const _startTime = Date.now() // Pour futures métriques si nécessaire

  try {
    // ─────────────────────────────────────────────────────────────
    // 🆕 0️⃣ VÉRIFICATION SESSION (préventif bugs intermittents)
    // ─────────────────────────────────────────────────────────────
    try {
      await ensureValidSession({ marginMinutes: 5 })
    } catch (sessionError) {
      console.error('❌ [STEP 0] Session invalide:', sessionError)
      throw new Error(
        'Votre session a expiré. Veuillez recharger la page et réessayer.'
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 1️⃣ VALIDATION ENTRÉE
    // ─────────────────────────────────────────────────────────────
    if (!file) {
      throw new Error('Aucun fichier fourni')
    }

    if (!userId) {
      throw new Error('userId requis')
    }

    if (onProgress) {
      onProgress({ step: 'validation', progress: 5 })
    }

    // ─────────────────────────────────────────────────────────────
    // 2️⃣ VALIDATION FICHIER (MIME + MAGIC BYTES)
    // ─────────────────────────────────────────────────────────────
    const validation = await validateImageFile(file)

    if (!validation.valid) {
      throw new Error(validation.error)
    }

    if (onProgress) {
      onProgress({ step: 'validation', progress: 10 })
    }

    // ─────────────────────────────────────────────────────────────
    // 3️⃣ CONVERSION HEIC → JPEG (si iPhone)
    // ─────────────────────────────────────────────────────────────
    let processedFile = file
    const conversionStart = Date.now()

    if (isHEIC(file)) {
      console.log('📱 iPhone HEIC détecté → conversion JPEG...')

      processedFile = await convertHEICtoJPEG(file)
      metrics.conversionMethod = 'heic_to_jpeg_then_webp'

      if (onProgress) {
        onProgress({ step: 'heic_conversion', progress: 20 })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4️⃣ CONVERSION → WEBP ≤ 20 KB (sauf SVG)
    // ─────────────────────────────────────────────────────────────
    if (processedFile.type !== 'image/svg+xml') {
      const webpFile = await convertToWebP(processedFile, {
        targetSizeKB: TARGET_MAX_UI_SIZE_KB,
      })

      if (!webpFile) {
        // Fallback : accepter original si < 100 KB
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

    // ─────────────────────────────────────────────────────────────
    // 5️⃣ CALCUL HASH SHA-256 (déduplication)
    // ─────────────────────────────────────────────────────────────
    const fileHash = await calculateFileHash(processedFile)

    if (onProgress) {
      onProgress({ step: 'hash', progress: 50 })
    }

    // ─────────────────────────────────────────────────────────────
    // 6️⃣ VÉRIFICATION DUPLICATION
    // ─────────────────────────────────────────────────────────────
    console.log('🔍 [STEP 6] Vérification duplication...')
    const { data: duplicateCheck, error: dupError } = await supabase.rpc(
      'check_duplicate_image',
      {
        p_user_id: userId,
        p_sha256_hash: fileHash,
      }
    )

    if (dupError) {
      console.error('❌ [STEP 6] Erreur vérification duplication:', dupError)
      // Continue malgré erreur (non bloquant)
    }

    console.log('✅ [STEP 6] Duplication check OK:', duplicateCheck)

    if (duplicateCheck?.exists) {
      console.log('♻️ Image identique trouvée → vérification existence fichier')

      // 🔍 Vérifier que le fichier existe réellement dans Storage
      const { data: fileExists } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .list(duplicateCheck.file_path.split('/').slice(0, -1).join('/'), {
          search: duplicateCheck.file_path.split('/').pop(),
        })

      if (fileExists && fileExists.length > 0) {
        console.log('✅ Fichier existe dans Storage → réutilisation')

        // Log metric duplication
        await logMetrics(userId, assetType, metrics)

        return {
          path: duplicateCheck.file_path,
          url: null, // Généré plus tard si besoin
          assetId: duplicateCheck.asset_id,
          width: duplicateCheck.width,
          height: duplicateCheck.height,
          isDuplicate: true,
          error: null,
        }
      } else {
        console.warn(
          '⚠️ Fichier supprimé du Storage → soft-delete asset + re-upload'
        )

        // Soft-delete l'ancien asset pour éviter conflit hash
        await supabase
          .from('user_assets')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', duplicateCheck.asset_id)

        // Continuer avec l'upload normal ci-dessous
      }
    }

    if (onProgress) {
      onProgress({ step: 'deduplication', progress: 60 })
    }

    // ─────────────────────────────────────────────────────────────
    // 7️⃣ VÉRIFICATION QUOTA UTILISATEUR
    // ─────────────────────────────────────────────────────────────
    console.log('🔍 [STEP 7] Vérification quota...')
    const { data: quotaCheck, error: quotaError } = await supabase.rpc(
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

    console.log('✅ [STEP 7] Quota check OK:', quotaCheck)

    if (!quotaCheck?.can_upload) {
      const reason = quotaCheck?.reason || 'limite atteinte'

      const messages = {
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

    // ─────────────────────────────────────────────────────────────
    // 8️⃣ EXTRAIRE DIMENSIONS
    // ─────────────────────────────────────────────────────────────
    console.log('🔍 [STEP 8] Extraction dimensions...')
    const { width, height } = await getImageDimensions(processedFile)
    console.log('✅ [STEP 8] Dimensions:', { width, height })

    // ─────────────────────────────────────────────────────────────
    // 9️⃣ UPLOAD SUPABASE STORAGE (avec retry)
    // ─────────────────────────────────────────────────────────────
    console.log('🔍 [STEP 9] Préparation upload...')
    const fileName = sanitizeFileName(processedFile.name)
    const storagePath = buildScopedPath(userId, fileName, prefix)
    console.log('📁 Chemin storage:', storagePath)

    const uploadStart = Date.now()

    const { data: storageData, error: storageError } = await uploadWithRetry(
      () =>
        supabase.storage
          .from(PRIVATE_BUCKET)
          .upload(storagePath, processedFile, {
            cacheControl: `${SIGNED_URL_TTL_SECONDS}`, // 24h
            upsert: false,
            contentType: processedFile.type,
          }),
      {
        maxRetries: 2,
        onRetry: ({ attempt, maxRetries }) => {
          console.log(`🔄 Réessai upload ${attempt}/${maxRetries}...`)

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

    console.log('✅ [STEP 9] Upload Storage OK:', storageData.path)

    metrics.uploadMs = Date.now() - uploadStart

    if (onProgress) {
      onProgress({ step: 'upload', progress: 85 })
    }

    // ─────────────────────────────────────────────────────────────
    // 🔟 ENREGISTREMENT USER_ASSETS
    // ─────────────────────────────────────────────────────────────
    console.log('🔍 [STEP 10] Enregistrement user_assets...')
    const { data: asset, error: dbError } = await supabase
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
      console.error('❌ [STEP 10] Erreur enregistrement BDD:', dbError)

      // Gérer erreur unicité (23505 - race condition déduplication)
      if (dbError.code === '23505') {
        console.warn('⚠️ Hash en conflit → récupération asset existant')

        const { data: existing } = await supabase
          .from('user_assets')
          .select('id, file_path, width, height')
          .eq('user_id', userId)
          .eq('sha256_hash', fileHash)
          .single()

        if (existing) {
          // Cleanup fichier uploadé (duplication détectée après coup)
          await supabase.storage.from(PRIVATE_BUCKET).remove([storageData.path])

          // Log metric
          await logMetrics(userId, assetType, metrics)

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

      // Cleanup storage si BDD fail (orphelin)
      await supabase.storage.from(PRIVATE_BUCKET).remove([storageData.path])

      throw dbError
    }

    if (onProgress) {
      onProgress({ step: 'database', progress: 95 })
    }

    // ─────────────────────────────────────────────────────────────
    // 1️⃣1️⃣ GÉNÉRATION SIGNED URL (TTL 24h)
    // ─────────────────────────────────────────────────────────────
    const { data: signedData, error: signError } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(storageData.path, SIGNED_URL_TTL_SECONDS)

    if (signError) {
      console.error('⚠️ Erreur génération signed URL:', signError)
      // Non bloquant → URL générée plus tard si besoin
    }

    // ─────────────────────────────────────────────────────────────
    // 1️⃣2️⃣ LOG METRICS (analytics)
    // ─────────────────────────────────────────────────────────────
    await logMetrics(userId, assetType, metrics)

    if (onProgress) {
      onProgress({ step: 'complete', progress: 100 })
    }

    console.log('✅ Upload réussi:', storageData.path)

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
    console.error('📊 Stack trace:', error.stack)

    // 🆕 Diagnostic détaillé pour bugs intermittents
    const diagnosticInfo = {
      name: error.name,
      message: error.message,
      code: error.code,
      userId: userId || 'UNDEFINED',
      fileSize: file?.size || 'UNKNOWN',
      timestamp: new Date().toISOString(),
    }

    // 🆕 Vérifier état session au moment de l'erreur
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      diagnosticInfo.sessionValid = !!session
      diagnosticInfo.sessionExpired = session?.expires_at
        ? session.expires_at * 1000 < Date.now()
        : null
      diagnosticInfo.sessionError = sessionError?.message || null
    } catch (sessionCheckError) {
      diagnosticInfo.sessionCheckFailed = sessionCheckError.message
    }

    console.error('📊 Diagnostic complet:', diagnosticInfo)

    metrics.result = 'failed'
    metrics.errorMessage = error.message

    // Log metric échec
    try {
      await logMetrics(userId, assetType, metrics)
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
      error,
    }
  }
}

/**
 * Log metrics upload (analytics)
 * @param {string} userId
 * @param {string} assetType
 * @param {Object} metrics
 */
async function logMetrics(userId, assetType, metrics) {
  try {
    await supabase.from('image_metrics').insert({
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
    })
  } catch (error) {
    console.error('⚠️ Erreur log metrics:', error)
    // Non bloquant
  }
}

/**
 * Remplace une image existante (incrémente version)
 * @param {string} assetId - ID asset à remplacer
 * @param {File} newFile - Nouveau fichier
 * @param {Object} options - Options (userId, onProgress)
 * @returns {Promise<{path, url, version, error}>}
 */
export async function replaceImage(assetId, newFile, options = {}) {
  const { userId, onProgress } = options

  if (!userId) {
    return { path: null, url: null, error: new Error('userId requis') }
  }

  try {
    // Récupérer asset existant
    const { data: existingAsset, error: fetchError } = await supabase
      .from('user_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingAsset) {
      throw new Error('Asset introuvable')
    }

    // Upload nouvelle version
    const uploadResult = await modernUploadImage(newFile, {
      userId,
      assetType: existingAsset.asset_type,
      prefix:
        existingAsset.asset_type === 'task_image' ? 'taches' : 'recompenses',
      onProgress,
    })

    if (uploadResult.error) {
      return uploadResult
    }

    // Soft delete ancienne version
    await supabase
      .from('user_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', assetId)

    // Incrémenter version nouvel asset
    const newVersion = (existingAsset.version || 1) + 1

    await supabase
      .from('user_assets')
      .update({ version: newVersion })
      .eq('id', uploadResult.assetId)

    console.log(
      `♻️ Image remplacée : v${existingAsset.version} → v${newVersion}`
    )

    // ─────────────────────────────────────────────────────────────
    // Invalider cache Service Worker (nouvelle version uploadée)
    // ─────────────────────────────────────────────────────────────
    if (uploadResult.url) {
      await invalidateImageCache(uploadResult.url)
    }

    return {
      ...uploadResult,
      version: newVersion,
    }
  } catch (error) {
    console.error('❌ Erreur remplacement image:', error)
    return { path: null, url: null, error }
  }
}
