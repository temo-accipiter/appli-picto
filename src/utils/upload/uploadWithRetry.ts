// src/utils/upload/uploadWithRetry.ts
// Retry automatique avec backoff exponentiel (réseau instable mobile 3G/4G)

export interface UploadRetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  onRetry?: (info: RetryInfo) => void
}

export interface RetryInfo {
  attempt: number
  maxRetries: number
  delay: number
  error: Error
}

/**
 * Exécute une fonction upload avec retry automatique
 *
 * Backoff exponentiel : 1s → 2s → 5s
 * Utile pour connexions mobiles instables (3G/4G)
 *
 * @param uploadFn - Fonction async à exécuter (doit retourner Promise)
 * @param options - Options retry
 * @param options.maxRetries - Nombre max de réessais (total: maxRetries + 1 tentatives) (défaut: 2)
 * @param options.baseDelay - Délai initial en ms (défaut: 1000)
 * @param options.maxDelay - Délai maximum en ms (défaut: 5000)
 * @param options.onRetry - Callback appelé avant chaque retry (pour UI)
 * @returns Résultat de uploadFn ou throw erreur finale
 *
 * @example
 * const result = await uploadWithRetry(
 *   () => supabase.storage.from('images').upload(path, file),
 *   {
 *     maxRetries: 2,
 *     onRetry: ({ attempt, delay }) => {
 *       console.log(`Retry ${attempt}, attente ${delay}ms...`)
 *     }
 *   }
 * )
 */
export async function uploadWithRetry<T>(
  uploadFn: () => Promise<T>,
  options: UploadRetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelay = 1000, // 1s
    maxDelay = 5000, // 5s max
    onRetry = null, // Callback pour UI (toast, progress)
  } = options

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadFn()
      return result // ✅ Succès
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        // ─────────────────────────────────────────────────────────────
        // Backoff exponentiel : 1s → 2s → 5s
        // ─────────────────────────────────────────────────────────────
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)

        console.warn(
          `⚠️ Upload échoué (tentative ${attempt + 1}/${maxRetries + 1}), retry dans ${delay}ms...`,
          (lastError as Error).message
        )

        // ─────────────────────────────────────────────────────────────
        // Callback UX (afficher toast "Connexion lente, réessai...")
        // ─────────────────────────────────────────────────────────────
        if (onRetry) {
          onRetry({
            attempt: attempt + 1,
            maxRetries,
            delay,
            error: lastError,
          })
        }

        // ─────────────────────────────────────────────────────────────
        // Attendre avant retry
        // ─────────────────────────────────────────────────────────────
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Tous les retries épuisés → erreur finale
  // ─────────────────────────────────────────────────────────────
  console.error('❌ Upload échoué après', maxRetries + 1, 'tentatives')
  throw lastError!
}
