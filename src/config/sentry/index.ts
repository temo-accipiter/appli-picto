/**
 * Configuration Sentry pour error tracking
 *
 * Features:
 * - Error tracking automatique
 * - Performance monitoring (optionnel)
 * - Session replay (optionnel, désactivé par défaut pour RGPD)
 * - Privacy-first: respect du consentement utilisateur
 * - Filtrage des données sensibles
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import * as Sentry from '@sentry/react'

/**
 * Type des options de configuration Sentry
 */
export interface SentryConfigOptions {
  /** Activer le performance monitoring (défaut: false) */
  enablePerformance?: boolean
  /** Activer le session replay (défaut: false, nécessite consentement RGPD) */
  enableReplay?: boolean
  /** Sample rate pour le performance monitoring (0.0 - 1.0) */
  tracesSampleRate?: number
  /** Sample rate pour les replays d'erreurs (0.0 - 1.0) */
  replaysOnErrorSampleRate?: number
}

/**
 * Données à exclure du tracking Sentry (RGPD)
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'session',
  'api_key',
  'access_token',
  'refresh_token',
  'stripe',
  'card',
  'cvv',
  'ssn',
]

/**
 * Vérifie si une clé contient des données sensibles
 */
const isSensitiveKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase()
  return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))
}

/**
 * Nettoie récursivement les données sensibles
 */
const sanitizeData = (data: unknown, depth = 0): unknown => {
  if (depth > 5) return '[Max Depth]' // Protection contre récursion infinie

  if (data === null || data === undefined) return data

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item, depth + 1))
    }

    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = '[Filtered]'
      } else {
        sanitized[key] = sanitizeData(value, depth + 1)
      }
    }
    return sanitized
  }

  return data
}

/**
 * Initialise Sentry si les variables d'environnement sont configurées
 */
export const initSentry = (options: SentryConfigOptions = {}): void => {
  const {
    enablePerformance = false,
    enableReplay = false,
    tracesSampleRate = 0.1, // 10% des transactions
    replaysOnErrorSampleRate = 1.0, // 100% des sessions avec erreur
  } = options

  const dsn = import.meta.env.VITE_SENTRY_DSN
  const environment = import.meta.env.VITE_APP_ENV || 'production'

  // Ne pas initialiser Sentry si pas de DSN configuré
  if (!dsn) {
    console.warn('Sentry DSN non configuré - error tracking désactivé')
    return
  }

  // Validation du DSN
  if (!dsn.startsWith('https://')) {
    console.error('Sentry DSN invalide - doit commencer par https://')
    return
  }

  try {
    Sentry.init({
      dsn,
      environment,

      // Intégrations
      integrations: [
        // Browser tracing pour performance monitoring
        ...(enablePerformance
          ? [
              Sentry.browserTracingIntegration({
                // FIXME: reactRouterV6Instrumentation deprecated in Sentry v8
                // TODO: Migrate to new routing instrumentation
                // routingInstrumentation: Sentry.reactRouterV6Instrumentation(...)
              }),
            ]
          : []),

        // Session replay (désactivé par défaut pour RGPD)
        ...(enableReplay
          ? [
              Sentry.replayIntegration({
                maskAllText: true, // Masquer tout le texte
                blockAllMedia: true, // Bloquer toutes les médias
              }),
            ]
          : []),

        // Filtrer les erreurs réseau non critiques
        Sentry.extraErrorDataIntegration(),
      ],

      // Performance Monitoring
      tracesSampleRate: enablePerformance ? tracesSampleRate : 0,

      // Session Replay
      replaysSessionSampleRate: 0, // Pas de replay sans erreur (RGPD)
      replaysOnErrorSampleRate: enableReplay ? replaysOnErrorSampleRate : 0,

      // Privacy et filtrage
      beforeSend(event, hint) {
        // Filtrer les données sensibles
        if (event.request) {
          event.request.headers = sanitizeData(event.request.headers)
          event.request.cookies = '[Filtered]'

          // Nettoyer les query params sensibles
          if (event.request.url) {
            try {
              const url = new URL(event.request.url)
              const params = new URLSearchParams(url.search)

              // Filtrer les paramètres sensibles
              for (const key of params.keys()) {
                if (isSensitiveKey(key)) {
                  params.set(key, '[Filtered]')
                }
              }

              url.search = params.toString()
              event.request.url = url.toString()
            } catch (e) {
              // Ignorer les erreurs de parsing d'URL
            }
          }
        }

        // Nettoyer les contextes
        if (event.contexts) {
          event.contexts = sanitizeData(event.contexts)
        }

        // Nettoyer les extras
        if (event.extra) {
          event.extra = sanitizeData(event.extra)
        }

        // Ignorer les erreurs non critiques
        if (hint.originalException) {
          const error = hint.originalException

          // Ignorer les erreurs réseau temporaires
          if (error instanceof Error) {
            if (
              error.message.includes('Failed to fetch') ||
              error.message.includes('Network request failed') ||
              error.message.includes('Load failed')
            ) {
              return null
            }
          }
        }

        return event
      },

      // Ignorer certaines erreurs connues
      ignoreErrors: [
        // Erreurs de navigation
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',

        // Erreurs navigateurs
        'Safari extension',
        'Chrome extension',

        // Erreurs third-party
        'fb_xd_fragment',
        'TEMPORARY_NETWORK_ERROR',
      ],

      // Ne pas tracker localhost en développement
      beforeSendTransaction(transaction) {
        if (transaction.request?.url?.includes('localhost')) {
          return null
        }
        return transaction
      },

      // Release tracking (optionnel)
      release: import.meta.env.VITE_APP_VERSION,
    })

    console.log('✅ Sentry initialisé avec succès')
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de Sentry:", error)
  }
}

/**
 * Définit l'utilisateur actuel pour Sentry
 * @param user - Données utilisateur (hasher l'ID pour RGPD)
 */
export const setSentryUser = (
  user: {
    id: string
    email?: string | undefined
    role?: string | undefined
  } | null
): void => {
  if (!user) {
    Sentry.setUser(null)
    return
  }

  // Hasher l'ID utilisateur pour RGPD
  const hashUserId = async (id: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(id + (import.meta.env.VITE_GA_SALT || ''))
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  hashUserId(user.id)
    .then(hashedId => {
      Sentry.setUser({
        id: hashedId,
        // Pas d'email pour RGPD (sauf si consentement explicite)
        role: user.role,
      })
    })
    .catch(() => {
      console.error("Erreur lors du hash de l'ID utilisateur")
    })
}

/**
 * Capture manuellement une erreur dans Sentry
 * @param error - L'erreur à capturer
 * @param context - Contexte additionnel
 */
export const captureError = (
  error: Error | string,
  context?: Record<string, unknown>
): void => {
  if (context) {
    Sentry.captureException(error, {
      extra: sanitizeData(context),
    })
  } else {
    Sentry.captureException(error)
  }
}

/**
 * Capture un message dans Sentry
 * @param message - Le message à capturer
 * @param level - Niveau de sévérité
 */
export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void => {
  Sentry.captureMessage(message, level)
}

/**
 * Démarre une transaction de performance
 * @param name - Nom de la transaction
 * @deprecated startTransaction is deprecated in Sentry v8, use startSpan instead
 */
export const startTransaction = (_name: string): null => {
  // FIXME: startTransaction deprecated in Sentry v8
  // TODO: Migrate to Sentry.startSpan()
  return null
}

/**
 * Teardown de Sentry (pour les tests ou cleanup)
 */
export const teardownSentry = async (): Promise<void> => {
  try {
    await Sentry.close(2000) // 2 secondes de timeout
    console.log('✅ Sentry fermé')
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture de Sentry:', error)
  }
}

// Export du namespace Sentry pour usage avancé
export { Sentry }
