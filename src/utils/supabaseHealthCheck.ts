// src/utils/supabaseHealthCheck.ts
/**
 * Détection et reset automatique d'un SDK Supabase gelé/corrompu
 *
 * Problème résolu :
 * - SDK Supabase en deadlock (getSession/refreshSession timeout)
 * - Promises non résolues causant gel de l'interface
 * - État corrompu après veille/inactivité prolongée
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const HEALTH_CHECK_TIMEOUT = 8000 // 8s max pour une réponse (augmenté pour éviter faux positifs)
const MAX_CONSECUTIVE_FAILURES = 3 // Nombre d'échecs avant reset (augmenté à 3 pour plus de tolérance)
const RELOAD_DELAY = 3000 // Délai avant reload (3s pour sauvegardes)
const BACKOFF_MULTIPLIER = 1.5 // Augmentation progressive du timeout après échec

let consecutiveFailures = 0
let lastHealthCheckTime = 0
let isHealthy = true
let currentTimeout = HEALTH_CHECK_TIMEOUT

// ✅ Logging pour debug (exposé sur window)
interface HealthLogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  data: Record<string, unknown>
}

interface SupabaseHealthStats {
  logs: HealthLogEntry[]
  stats: {
    isHealthy: boolean
    consecutiveFailures: number
    lastCheckTime: number
  }
}

interface WindowWithHealth extends Window {
  __supabaseHealth?: SupabaseHealthStats
}

const healthLogs: HealthLogEntry[] = []
const MAX_LOGS = 50

function logHealth(
  level: 'info' | 'warn' | 'error',
  message: string,
  data: Record<string, unknown> = {}
) {
  const entry: HealthLogEntry = {
    timestamp: new Date().toISOString(),
    level, // 'info' | 'warn' | 'error'
    message,
    data,
  }

  healthLogs.push(entry)

  // Garder seulement les 50 derniers logs
  if (healthLogs.length > MAX_LOGS) {
    healthLogs.shift()
  }

  // Exposer sur window pour debug
  if (typeof window !== 'undefined') {
    ;(window as WindowWithHealth).__supabaseHealth = {
      logs: healthLogs,
      stats: {
        isHealthy,
        consecutiveFailures,
        lastCheckTime: lastHealthCheckTime,
      },
    }
  }

  // Log console en dev
  if (process.env.NODE_ENV === 'development') {
    const consoleMethod =
      level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    console[consoleMethod](`[SupabaseHealth] ${message}`, data)
  }
}

interface HealthCheckResult {
  healthy: boolean
  error?: string
  shouldReset?: boolean
}

/**
 * Vérifie si le SDK Supabase répond correctement
 * @param {Object} supabaseClient - Instance Supabase à tester
 * @returns {Promise<{healthy: boolean, error?: string}>}
 */
export async function checkSupabaseHealth(
  supabaseClient: SupabaseClient
): Promise<HealthCheckResult> {
  if (!supabaseClient) {
    logHealth('error', 'No Supabase client provided')
    return { healthy: false, error: 'no-client' }
  }

  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), ms)
      ),
    ])

  try {
    // Test 1: getSession() doit répondre rapidement
    const sessionResult = await withTimeout(
      supabaseClient.auth.getSession(),
      currentTimeout
    )

    if (!sessionResult) {
      throw new Error('getSession returned null')
    }

    // Test 2: Petit select pour vérifier l'API REST
    const queryPromise = supabaseClient.from('parametres').select('id').limit(1)
    const queryResult = await withTimeout(
      queryPromise as unknown as Promise<unknown>,
      currentTimeout
    )

    if (queryResult === undefined) {
      throw new Error('query returned undefined')
    }

    // ✅ SDK répond correctement
    consecutiveFailures = 0
    currentTimeout = HEALTH_CHECK_TIMEOUT // Reset timeout
    isHealthy = true
    lastHealthCheckTime = Date.now()

    logHealth('info', 'Health check passed', {
      consecutiveFailures: 0,
      timeout: currentTimeout,
    })

    return { healthy: true }
  } catch (error) {
    consecutiveFailures++
    isHealthy = false
    lastHealthCheckTime = Date.now()

    // Augmenter progressivement le timeout pour éviter les faux positifs persistants
    currentTimeout = Math.min(
      currentTimeout * BACKOFF_MULTIPLIER,
      HEALTH_CHECK_TIMEOUT * 3 // Max 24s
    )

    const errorMsg = error instanceof Error ? error.message : String(error)

    logHealth(
      'warn',
      `Check failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`,
      {
        error: errorMsg,
        consecutiveFailures,
        nextTimeout: Math.round(currentTimeout),
      }
    )

    return {
      healthy: false,
      error: errorMsg,
      shouldReset: consecutiveFailures >= MAX_CONSECUTIVE_FAILURES,
    }
  }
}

interface ResetOptions {
  onBeforeReload?: () => void
}

/**
 * Reset l'état interne du SDK
 * @param {Object} supabaseClient - Instance à réinitialiser
 * @param {Object} options - Options de reset
 * @param {Function} options.onBeforeReload - Callback avant reload (pour toast)
 */
export function resetSupabaseClient(
  supabaseClient: SupabaseClient,
  options: ResetOptions = {}
) {
  if (!supabaseClient) return

  try {
    logHealth('warn', '🔄 Resetting corrupted Supabase SDK...')

    // 1. Cleanup tous les channels Realtime
    if (supabaseClient.realtime?.channels) {
      const channels = Object.values(supabaseClient.realtime.channels)
      logHealth('info', `Removing ${channels.length} Realtime channels`)

      channels.forEach(channel => {
        try {
          supabaseClient.removeChannel(channel)
        } catch {
          // Ignore les erreurs de cleanup
        }
      })
    }

    // 2. Cleanup tous les listeners auth
    if (supabaseClient.auth?.onAuthStateChange) {
      try {
        // Force unsubscribe de tous les listeners
        const { data } = supabaseClient.auth.onAuthStateChange(() => {})
        if (data?.subscription) {
          data.subscription.unsubscribe()
        }
        logHealth('info', 'Auth listeners cleaned up')
      } catch {
        // Ignore
      }
    }

    // 3. Reset les compteurs
    consecutiveFailures = 0
    currentTimeout = HEALTH_CHECK_TIMEOUT
    isHealthy = true
    lastHealthCheckTime = Date.now()

    logHealth('info', '✅ Client reset complete, preparing reload...')

    // 4. Callback avant reload (pour afficher toast)
    if (
      options.onBeforeReload &&
      typeof options.onBeforeReload === 'function'
    ) {
      options.onBeforeReload()
    }

    // 5. Délai avant reload pour permettre sauvegardes
    setTimeout(() => {
      logHealth('info', '🔄 Reloading page...')
      window.location.reload()
    }, RELOAD_DELAY)
  } catch (error) {
    logHealth('error', 'Reset failed', { error: String(error) })
  }
}

interface HealthStats {
  isHealthy: boolean
  consecutiveFailures: number
  lastCheckTime: number
  timeSinceLastCheck: number
}

/**
 * Obtient les statistiques de santé
 */
export function getHealthStats(): HealthStats {
  return {
    isHealthy,
    consecutiveFailures,
    lastCheckTime: lastHealthCheckTime,
    timeSinceLastCheck: Date.now() - lastHealthCheckTime,
  }
}

/**
 * Reset manuel des compteurs
 */
export function resetHealthStats(): void {
  consecutiveFailures = 0
  currentTimeout = HEALTH_CHECK_TIMEOUT
  isHealthy = true
  lastHealthCheckTime = 0
}
