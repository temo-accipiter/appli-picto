// src/utils/upload/uploadWithRetry.js
// Retry automatique avec backoff exponentiel (réseau instable mobile 3G/4G)

/**
 * Exécute une fonction upload avec retry automatique
 *
 * Backoff exponentiel : 1s → 2s → 5s
 * Utile pour connexions mobiles instables (3G/4G)
 *
 * @param {Function} uploadFn - Fonction async à exécuter (doit retourner Promise)
 * @param {Object} options - Options retry
 * @param {number} [options.maxRetries=2] - Nombre max de réessais (total: maxRetries + 1 tentatives)
 * @param {number} [options.baseDelay=1000] - Délai initial en ms
 * @param {number} [options.maxDelay=5000] - Délai maximum en ms
 * @param {Function} [options.onRetry=null] - Callback appelé avant chaque retry (pour UI)
 * @returns {Promise} - Résultat de uploadFn ou throw erreur finale
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
export async function uploadWithRetry(uploadFn, options = {}) {
  const {
    maxRetries = 2,
    baseDelay = 1000, // 1s
    maxDelay = 5000, // 5s max
    onRetry = null, // Callback pour UI (toast, progress)
  } = options

  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadFn()
      return result // ✅ Succès
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        // ─────────────────────────────────────────────────────────────
        // Backoff exponentiel : 1s → 2s → 5s
        // ─────────────────────────────────────────────────────────────
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)

        console.warn(
          `⚠️ Upload échoué (tentative ${attempt + 1}/${maxRetries + 1}), retry dans ${delay}ms...`,
          error.message
        )

        // ─────────────────────────────────────────────────────────────
        // Callback UX (afficher toast "Connexion lente, réessai...")
        // ─────────────────────────────────────────────────────────────
        if (onRetry) {
          onRetry({
            attempt: attempt + 1,
            maxRetries,
            delay,
            error,
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
  throw lastError
}
