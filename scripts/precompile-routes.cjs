#!/usr/bin/env node
/**
 * Script de pré-compilation des routes Next.js
 *
 * Pré-compile les routes fréquemment utilisées pour accélérer le démarrage
 * en développement. Réduit le temps de première visite de ~30s à ~5s.
 *
 * Usage: node scripts/precompile-routes.js
 */

const http = require('http')

const routes = ['/', '/tableau', '/edition', '/login', '/profil']

const BASE_URL = 'http://localhost:3000'
const TIMEOUT = 60000 // 60 secondes

async function fetchRoute(route) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    const req = http.get(`${BASE_URL}${route}`, res => {
      const duration = Date.now() - startTime

      if (res.statusCode === 200) {
        console.log(`✅ ${route} - ${duration}ms`)
        resolve()
      } else {
        console.log(`⚠️  ${route} - ${res.statusCode} (${duration}ms)`)
        resolve() // Continue même en cas d'erreur
      }

      // Consommer la réponse pour libérer la connexion
      res.on('data', () => {})
      res.on('end', () => {})
    })

    req.setTimeout(TIMEOUT, () => {
      console.log(`⏱️  ${route} - timeout après ${TIMEOUT}ms`)
      req.destroy()
      resolve()
    })

    req.on('error', err => {
      console.log(`❌ ${route} - ${err.message}`)
      resolve() // Continue même en cas d'erreur
    })
  })
}

async function precompileRoutes() {
  console.log('🚀 Pré-compilation des routes Next.js...\n')

  // Attendre que le serveur soit prêt
  console.log('⏳ Attente du serveur Next.js...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Pré-compiler chaque route séquentiellement
  for (const route of routes) {
    await fetchRoute(route)
  }

  console.log('\n✨ Pré-compilation terminée !')
  console.log('💡 Les prochaines visites seront plus rapides.\n')
}

precompileRoutes().catch(console.error)
