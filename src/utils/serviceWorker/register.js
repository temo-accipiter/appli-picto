// src/utils/serviceWorker/register.js
// Enregistrement et gestion Service Worker

/**
 * Enregistre le Service Worker (production uniquement)
 *
 * @returns {Promise<ServiceWorkerRegistration|null>}
 *
 * @example
 * const registration = await registerServiceWorker()
 * if (registration) {
 *   console.log('Service Worker prêt')
 * }
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker non supporté par ce navigateur')
    return null
  }

  if (import.meta.env.DEV) {
    console.log('🛠️ Mode dev → Service Worker désactivé')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    console.log('✅ Service Worker enregistré:', registration.scope)

    // Vérifier updates périodiquement (1h)
    setInterval(
      () => {
        registration.update()
      },
      60 * 60 * 1000
    )

    return registration
  } catch (error) {
    console.error('❌ Erreur enregistrement Service Worker:', error)
    return null
  }
}

/**
 * Invalide le cache d'une image spécifique
 * Usage : Après remplacement image
 *
 * @param {string} url - URL image à invalider
 *
 * @example
 * await invalidateImageCache(imageUrl)
 */
export async function invalidateImageCache(url) {
  if (!navigator.serviceWorker.controller) {
    console.warn('⚠️ Pas de Service Worker actif')
    return
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'INVALIDATE_IMAGE',
    url,
  })

  console.log('🗑️ Invalidation cache demandée:', url)
}

/**
 * Vide tout le cache (debug/admin)
 *
 * @example
 * await clearAllCache()
 */
export async function clearAllCache() {
  if (!navigator.serviceWorker.controller) {
    console.warn('⚠️ Pas de Service Worker actif')
    return
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'CLEAR_ALL_CACHE',
  })

  console.log('🗑️ Vidage total cache demandé')
}
