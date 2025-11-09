/**
 * Handlers globaux pour les erreurs non capturées
 *
 * Ces handlers capturent :
 * - window.onerror (erreurs JavaScript non gérées)
 * - window.onunhandledrejection (promesses rejetées non gérées)
 * - console.error (si activé)
 *
 * Les erreurs sont automatiquement envoyées à Sentry
 */

import { captureError, captureMessage } from './index'

/**
 * Active les handlers globaux d'erreurs
 */
export const setupGlobalErrorHandlers = (): void => {
  // Handler pour les erreurs non capturées
  window.addEventListener('error', (event: ErrorEvent) => {
    console.error('🚨 Uncaught error:', event.error || event.message)

    if (import.meta.env.VITE_SENTRY_DSN) {
      captureError(event.error || new Error(event.message), {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    }
  })

  // Handler pour les promesses rejetées non gérées
  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled promise rejection:', event.reason)

      if (import.meta.env.VITE_SENTRY_DSN) {
        const error =
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason))

        captureError(error, {
          source: 'unhandledrejection',
          promise: true,
        })
      }
    }
  )

  // Log de confirmation
  if (import.meta.env.DEV) {
    console.log('✅ Global error handlers activés')
  }
}

/**
 * Wrapper optionnel pour console.error (désactivé par défaut)
 * Permet de tracker tous les console.error dans Sentry
 */
export const setupConsoleErrorTracking = (): void => {
  if (!import.meta.env.VITE_SENTRY_DSN) return

  const originalError = console.error.bind(console)

  console.error = (...args: unknown[]) => {
    // Appeler le console.error original
    originalError(...args)

    // Envoyer à Sentry si c'est une Error
    const firstArg = args[0]
    if (firstArg instanceof Error) {
      captureMessage(`Console error: ${firstArg.message}`, 'error')
    }
  }

  if (import.meta.env.DEV) {
    console.log('✅ Console.error tracking activé')
  }
}
