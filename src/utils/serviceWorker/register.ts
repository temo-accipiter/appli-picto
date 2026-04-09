// src/utils/serviceWorker/register.ts
// Enregistrement et gestion Service Worker

interface ServiceWorkerMessage {
  type: 'INVALIDATE_IMAGE' | 'CLEAR_ALL_CACHE'
  url?: string
}

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
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker non supporté par ce navigateur')
    return null
  }

  if (process.env.NODE_ENV === 'development') {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

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
export async function invalidateImageCache(url: string): Promise<void> {
  if (!navigator.serviceWorker.controller) {
    console.warn('⚠️ Pas de Service Worker actif')
    return
  }

  const message: ServiceWorkerMessage = {
    type: 'INVALIDATE_IMAGE',
    url,
  }

  navigator.serviceWorker.controller.postMessage(message)
}

/**
 * Vide tout le cache (debug/admin)
 *
 * @example
 * await clearAllCache()
 */
export async function clearAllCache(): Promise<void> {
  if (!navigator.serviceWorker.controller) {
    console.warn('⚠️ Pas de Service Worker actif')
    return
  }

  const message: ServiceWorkerMessage = {
    type: 'CLEAR_ALL_CACHE',
  }

  navigator.serviceWorker.controller.postMessage(message)
}
