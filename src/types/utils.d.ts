// src/types/utils.d.ts
// Types utilitaires

/**
 * Helper pour les uploads d'images
 */
export interface UploadImageOptions {
  userId: string
  assetType: 'task_image' | 'reward_image' | 'profile_avatar'
  prefix?: string
  onProgress?: (progress: number) => void
}

export interface UploadImageResult {
  path: string | null
  error: Error | null
}

export interface ReplaceImageResult {
  path: string | null
  error: Error | null
}

/**
 * Helper pour les erreurs Supabase
 */
export interface PostgrestError {
  message: string
  details?: string
  hint?: string
  code?: string
}

/**
 * Helper pour les abort controllers
 */
export interface AbortableResponse<T> {
  data: T | null
  error: Error | null
  aborted?: boolean
}
