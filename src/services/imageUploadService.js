// src/services/imageUploadService.js
// Service d'upload d'images avec quotas et optimisations
import { supabase } from '@/utils'

// Configuration des quotas d'images
const IMAGE_CONFIG = {
  maxSize: 50 * 1024, // 50 Ko max
  maxDimensions: { width: 256, height: 256 },
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  cacheControl: '31536000', // 1 an en cache
  signedUrlTTL: 6 * 60 * 60, // 6 heures pour les URLs signées
}

/**
 * Vérifie si un fichier image est valide
 */
export function validateImageFile(file) {
  const errors = []

  // Vérifier le type MIME
  if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
    errors.push(
      `Type de fichier non autorisé. Types acceptés: ${IMAGE_CONFIG.allowedTypes.join(', ')}`
    )
  }

  // Vérifier la taille
  if (file.size > IMAGE_CONFIG.maxSize) {
    errors.push(
      `Fichier trop volumineux. Taille max: ${IMAGE_CONFIG.maxSize / 1024} Ko`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Redimensionne une image si nécessaire
 */
export async function resizeImageIfNeeded(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      const { width, height } = IMAGE_CONFIG.maxDimensions

      // Si l'image est déjà dans les bonnes dimensions, pas besoin de redimensionner
      if (img.width <= width && img.height <= height) {
        resolve(file)
        return
      }

      // Calculer les nouvelles dimensions en gardant le ratio
      let newWidth = img.width
      let newHeight = img.height

      if (newWidth > width) {
        newHeight = (newHeight * width) / newWidth
        newWidth = width
      }

      if (newHeight > height) {
        newWidth = (newWidth * height) / newHeight
        newHeight = height
      }

      // Redimensionner
      canvas.width = newWidth
      canvas.height = newHeight
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      canvas.toBlob(
        blob => {
          if (blob) {
            const resizedFile = new File([blob], file.name, { type: file.type })
            resolve(resizedFile)
          } else {
            reject(new Error('Erreur lors du redimensionnement'))
          }
        },
        file.type,
        0.8
      ) // Qualité 80%
    }

    img.onerror = () => reject(new Error("Impossible de charger l'image"))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Vérifie les quotas d'images pour un utilisateur
 */
export async function checkImageQuota(userId, assetType) {
  try {
    const { data, error } = await supabase.rpc('check_image_quota', {
      p_user_id: userId,
      p_asset_type: assetType,
    })

    if (error) {
      // Si la fonction n'existe pas encore, permettre l'upload
      if (
        error.code === 'PGRST202' ||
        error.message?.includes('Could not find the function')
      ) {
        console.warn(
          "Fonction check_image_quota pas encore créée, autorisation d'upload par défaut"
        )
        return {
          canUpload: true,
          reason: 'function_not_created',
          role: 'free', // Par défaut
          quotas: {},
          stats: {},
        }
      }
      throw error
    }

    return {
      canUpload: data.can_upload,
      reason: data.reason,
      role: data.role,
      quotas: data.quotas,
      stats: data.stats,
    }
  } catch (error) {
    console.error('Erreur vérification quota image:', error)
    return {
      canUpload: false,
      reason: 'error',
      error: error.message,
    }
  }
}

/**
 * Upload une image avec vérification des quotas
 */
export async function uploadImageWithQuota(file, assetType, userId) {
  try {
    // 1. Validation du fichier
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    // 2. Vérification des quotas
    const quotaCheck = await checkImageQuota(userId, assetType)
    if (!quotaCheck.canUpload) {
      throw new Error(`Quota atteint: ${quotaCheck.reason}`)
    }

    // 3. Redimensionnement si nécessaire
    const processedFile = await resizeImageIfNeeded(file)

    // 4. Génération du chemin de fichier
    const timestamp = Date.now()
    const cleanName = file.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_.-]/g, '')
    const filePath = `${userId}/${assetType}s/${timestamp}-${cleanName}`

    // 5. Upload vers Supabase Storage avec cache agressif
    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, processedFile, {
        cacheControl: IMAGE_CONFIG.cacheControl,
        upsert: false,
      })

    if (uploadError) throw uploadError

    // 6. Enregistrement dans la table de suivi
    const { error: trackingError } = await supabase.from('user_assets').insert({
      user_id: userId,
      asset_type: assetType,
      file_path: filePath,
      file_size: processedFile.size,
      mime_type: processedFile.type,
      dimensions: `${processedFile.width || 'unknown'}x${processedFile.height || 'unknown'}`,
    })

    if (trackingError) {
      console.warn('Erreur enregistrement tracking:', trackingError)
      // Ne pas échouer l'upload pour ça, mais logger
    }

    // 7. Génération URL signée avec TTL court
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from('images')
        .createSignedUrl(filePath, IMAGE_CONFIG.signedUrlTTL)

    if (signedUrlError) {
      console.warn('Erreur génération URL signée:', signedUrlError)
      return { filePath, success: true }
    }

    return {
      filePath,
      signedUrl: signedUrlData.signedUrl,
      success: true,
      fileSize: processedFile.size,
    }
  } catch (error) {
    console.error('Erreur upload image:', error)
    throw error
  }
}

/**
 * Supprime une image et met à jour les quotas
 */
export async function deleteImageWithQuota(filePath, userId) {
  try {
    // 1. Suppression du fichier dans Storage
    const { error: storageError } = await supabase.storage
      .from('images')
      .remove([filePath])

    if (storageError) throw storageError

    // 2. Suppression de l'enregistrement de tracking
    const { error: trackingError } = await supabase
      .from('user_assets')
      .delete()
      .eq('user_id', userId)
      .eq('file_path', filePath)

    if (trackingError) {
      console.warn('Erreur suppression tracking:', trackingError)
    }

    return { success: true }
  } catch (error) {
    console.error('Erreur suppression image:', error)
    throw error
  }
}

/**
 * Obtient les statistiques d'assets d'un utilisateur
 */
export async function getUserAssetsStats(userId) {
  try {
    const { data, error } = await supabase.rpc('get_user_assets_stats', {
      p_user_id: userId,
    })

    if (error) {
      // Si la fonction n'existe pas encore, retourner des stats par défaut
      if (
        error.code === 'PGRST202' ||
        error.message?.includes('Could not find the function')
      ) {
        console.warn(
          'Fonction get_user_assets_stats pas encore créée, retour de stats par défaut'
        )
        return {
          total_images: 0,
          total_size: 0,
          task_images: 0,
          reward_images: 0,
          task_images_size: 0,
          reward_images_size: 0,
        }
      }
      throw error
    }
    return data
  } catch (error) {
    console.error('Erreur récupération stats assets:', error)
    // Retourner des stats par défaut en cas d'erreur
    return {
      total_images: 0,
      total_size: 0,
      task_images: 0,
      reward_images: 0,
      task_images_size: 0,
      reward_images_size: 0,
    }
  }
}
