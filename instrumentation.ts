/**
 * Instrumentation pour Next.js
 *
 * Ce fichier est chargé automatiquement par Next.js au démarrage de l'application
 * Il permet d'initialiser des outils d'observabilité comme Sentry
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Charger la configuration Sentry côté serveur
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Charger la configuration Sentry pour edge runtime (middleware)
    await import('./sentry.edge.config')
  }
}
