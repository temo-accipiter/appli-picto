// public/sw.js
// Service Worker : Cache offline images avec stratégie TSA-friendly

const CACHE_VERSION = 'appli-picto-v1'
const IMAGE_CACHE = 'appli-picto-images-v1'
const STATIC_CACHE = 'appli-picto-static-v1'

// Assets statiques à pré-cacher
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json']

// Placeholder SVG apaisant (TSA-friendly : pas d'image cassée)
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect fill="#E8F4F8" width="192" height="192"/>
  <circle cx="96" cy="96" r="40" fill="#B8E0F0" opacity="0.5"/>
  <text x="96" y="105" font-family="Arial" font-size="12" fill="#5A9FB8" text-anchor="middle">Chargement...</text>
</svg>`

// ═══════════════════════════════════════════════════════════════════════════
// INSTALL : Pré-cache assets statiques
// ═══════════════════════════════════════════════════════════════════════════
self.addEventListener('install', event => {
  console.log('📦 Service Worker : Installation...')

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS)
    })
  )

  self.skipWaiting()
})

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVATE : Nettoyer vieux caches
// ═══════════════════════════════════════════════════════════════════════════
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker : Activation...')

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => {
            return (
              name !== IMAGE_CACHE &&
              name !== STATIC_CACHE &&
              name !== CACHE_VERSION
            )
          })
          .map(name => {
            console.log('🗑️ Suppression vieux cache:', name)
            return caches.delete(name)
          })
      )
    })
  )

  self.clients.claim()
})

// ═══════════════════════════════════════════════════════════════════════════
// FETCH : Stratégie cache pour images
// ═══════════════════════════════════════════════════════════════════════════
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // ─────────────────────────────────────────────────────────────
  // Stratégie cache modéré pour images (Supabase Storage)
  // ─────────────────────────────────────────────────────────────
  if (
    request.destination === 'image' ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/storage/v1/object/')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          // ─────────────────────────────────────────────────────────────
          // Vérifier fraîcheur cache (max 1 heure)
          // ─────────────────────────────────────────────────────────────
          if (cachedResponse) {
            const cacheDate = new Date(cachedResponse.headers.get('date'))
            const now = new Date()
            const ageMinutes = (now - cacheDate) / 1000 / 60

            // Cache récent (< 1h) → servir
            if (ageMinutes < 60) {
              console.log('✅ Cache hit (frais) :', url.pathname.slice(-30))
              return cachedResponse
            } else {
              console.log('⚠️ Cache périmé (> 1h), fetch réseau...')
            }
          }

          // ─────────────────────────────────────────────────────────────
          // Cache miss ou périmé → fetch réseau
          // ─────────────────────────────────────────────────────────────
          return fetch(request)
            .then(networkResponse => {
              // Cache si succès
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone())
              }
              return networkResponse
            })
            .catch(error => {
              console.error('❌ Fetch image échoué:', error.message)

              // ─────────────────────────────────────────────────────────────
              // Offline → servir cache périmé si existe
              // ─────────────────────────────────────────────────────────────
              if (cachedResponse) {
                console.log('📴 Mode offline → cache périmé utilisé (fallback)')
                return cachedResponse
              }

              // ─────────────────────────────────────────────────────────────
              // Pas de cache → placeholder SVG apaisant
              // ─────────────────────────────────────────────────────────────
              console.log('🖼️ Affichage placeholder (aucun cache)')
              return new Response(PLACEHOLDER_SVG, {
                status: 200,
                headers: {
                  'Content-Type': 'image/svg+xml',
                  'Cache-Control': 'no-cache',
                },
              })
            })
        })
      })
    )
    return
  }

  // ─────────────────────────────────────────────────────────────
  // Stratégie network-first pour le reste
  // ─────────────────────────────────────────────────────────────
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request)
    })
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE : Invalider cache spécifique
// ═══════════════════════════════════════════════════════════════════════════
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'INVALIDATE_IMAGE') {
    const { url } = event.data
    console.log('🗑️ Invalidation cache image:', url)

    caches.open(IMAGE_CACHE).then(cache => {
      cache.delete(url)
    })
  }

  if (event.data && event.data.type === 'CLEAR_ALL_CACHE') {
    console.log('🗑️ Vidage total cache')

    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(name => caches.delete(name)))
    })
  }
})
