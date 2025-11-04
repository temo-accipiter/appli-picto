// src/utils/supabaseHeartbeat.js
/**
 * Health check périodique du SDK Supabase
 * Détecte et corrige automatiquement les états corrompus
 */

import { checkSupabaseHealth, resetSupabaseClient } from './supabaseHealthCheck'

const HEARTBEAT_INTERVAL = 60000 // Vérifier toutes les 60 secondes (réduit pour éviter faux positifs)
const VISIBILITY_CHECK_DELAY = 5000 // Délai après retour de visibilité (augmenté à 5s)
const MIN_CHECK_INTERVAL = 10000 // Minimum 10s entre deux checks (évite rafales)

let heartbeatTimer = null
let visibilityListener = null
let lastCheckTime = 0
let isCheckRunning = false

/**
 * Démarre le health check périodique
 * @param {Object} supabaseClient - Instance Supabase à surveiller
 * @param {Object} options - Options
 * @param {Function} options.showToast - Fonction pour afficher un toast (optionnel)
 */
export function startSupabaseHeartbeat(supabaseClient, options = {}) {
  if (!supabaseClient) return

  // Arrêter l'ancien heartbeat s'il existe
  stopSupabaseHeartbeat()

  // Health check périodique avec debounce
  const runCheck = async () => {
    const now = Date.now()

    // Éviter les checks en rafale (min 10s entre deux checks)
    if (isCheckRunning || now - lastCheckTime < MIN_CHECK_INTERVAL) {
      if (import.meta.env.DEV) {
        console.log(
          '[Heartbeat] ⏭️ Check skipped (cooldown or already running)'
        )
      }
      return
    }

    isCheckRunning = true
    lastCheckTime = now

    try {
      const health = await checkSupabaseHealth(supabaseClient)

      if (!health.healthy && health.shouldReset) {
        if (import.meta.env.DEV) {
          console.warn('[Heartbeat] 💔 SDK corrupted, reloading page...')
        }

        // Callback pour afficher un toast avant reload
        const onBeforeReload = () => {
          if (options.showToast && typeof options.showToast === 'function') {
            options.showToast(
              'Connexion interrompue – reconnexion automatique en cours...',
              'info'
            )
          }
        }

        // Reset + reload avec toast
        resetSupabaseClient(supabaseClient, { onBeforeReload })
      }
    } finally {
      isCheckRunning = false
    }
  }

  // Démarrer le timer
  heartbeatTimer = setInterval(runCheck, HEARTBEAT_INTERVAL)

  // ⚠️ DÉSACTIVÉ : Le check au retour de visibilité cause des faux positifs
  // Quand l'onglet revient, le SDK Supabase est encore en train de se reconnecter,
  // et nos requêtes timeoutent systématiquement. Le heartbeat régulier suffit.
  //
  // if (typeof document !== 'undefined') {
  //   visibilityListener = async () => {
  //     if (document.visibilityState === 'visible') {
  //       setTimeout(runCheck, VISIBILITY_CHECK_DELAY)
  //     }
  //   }
  //   document.addEventListener('visibilitychange', visibilityListener)
  // }

  if (import.meta.env.DEV) {
    console.log('[Heartbeat] 💓 Started monitoring Supabase SDK health')
  }
}

/**
 * Arrête le health check périodique
 */
export function stopSupabaseHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  if (visibilityListener && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityListener)
    visibilityListener = null
  }

  // Reset state
  lastCheckTime = 0
  isCheckRunning = false

  if (import.meta.env.DEV) {
    console.log('[Heartbeat] 💔 Stopped monitoring')
  }
}
