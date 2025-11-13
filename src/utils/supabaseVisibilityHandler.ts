// src/utils/supabaseVisibilityHandler.ts
import { recreateSupabaseClient } from './supabaseClient'
import type { SupabaseClient } from '@supabase/supabase-js'

// Interface pour accéder aux propriétés internes du client Supabase
interface SupabaseClientInternal {
  supabaseUrl?: string
  supabaseKey?: string
}

/**
 * VERSION PRAGMATIQUE FINALE
 *
 * On ne peut PAS empêcher le deadlock (limitations navigateur + HTTP/2 + Supabase)
 * Donc on se concentre sur une DÉTECTION RAPIDE et une RECRÉATION PROPRE
 */

const SDK_RECREATION_EVENT = 'supabase-client-recreated'
const MIN_HIDDEN_DURATION = 5000 // 5s (Chrome suspend après ~5-10s)
const HEALTH_CHECK_TIMEOUT = 3000 // 3s timeout

let visibilityHandler: (() => void) | null = null
let tabHiddenSince: number | null = null
let lastRecreationTime = 0
const MIN_RECREATION_INTERVAL = 10000 // Minimum 10s entre recréations

/**
 * Démarre l'écoute des changements de visibilité
 */
export function startVisibilityHandler(supabaseClient: SupabaseClient): void {
  if (!supabaseClient || typeof document === 'undefined') return

  stopVisibilityHandler()

  visibilityHandler = async () => {
    if (document.visibilityState === 'hidden') {
      tabHiddenSince = Date.now()
      if (import.meta.env.DEV) {
        console.log('[Visibility] 👁️ Tab hidden')
      }
      return
    }

    if (document.visibilityState !== 'visible') return

    const hiddenDuration = tabHiddenSince ? Date.now() - tabHiddenSince : 0
    tabHiddenSince = null

    if (import.meta.env.DEV) {
      console.log(
        `[Visibility] 👁️ Tab visible (was hidden ${Math.round(hiddenDuration / 1000)}s)`
      )
    }

    // Skip si absence très courte
    if (hiddenDuration < MIN_HIDDEN_DURATION) {
      if (import.meta.env.DEV) {
        console.log('[Visibility] ⏭️ Short absence, skipping')
      }
      return
    }

    // 🔑 Éviter recréations en rafale
    const timeSinceLastRecreation = Date.now() - lastRecreationTime
    if (timeSinceLastRecreation < MIN_RECREATION_INTERVAL) {
      if (import.meta.env.DEV) {
        console.log('[Visibility] ⏭️ Too soon since last recreation, skipping')
      }
      return
    }

    // Test API avec timeout court
    if (import.meta.env.DEV) {
      console.log('[Visibility] 🔍 Testing API...')
    }

    try {
      const supabaseUrl =
        (supabaseClient as SupabaseClientInternal).supabaseUrl ||
        import.meta.env.VITE_SUPABASE_URL
      const supabaseKey =
        (supabaseClient as SupabaseClientInternal).supabaseKey ||
        import.meta.env.VITE_SUPABASE_ANON_KEY

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)

      // 🔑 Test simple sans query params (pour éviter erreurs PostgREST)
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD', // HEAD au lieu de GET (plus léger)
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (response.ok || response.status === 404) {
        // API répond (même 404 = API fonctionne)
        if (import.meta.env.DEV) {
          console.log('[Visibility] ✅ API healthy, no recreation needed')
        }
        return
      } else {
        throw new Error(`API returned ${response.status}`)
      }
    } catch (apiError) {
      // API ne répond pas → Recréer
      if (import.meta.env.DEV) {
        const errorMsg =
          apiError instanceof Error ? apiError.message : String(apiError)
        console.warn('[Visibility] ❌ API check failed:', errorMsg)
        console.log('[Visibility] 🔄 Recreating SDK...')
      }

      try {
        lastRecreationTime = Date.now()
        const { session } = await recreateSupabaseClient()

        // Notifier l'application
        const event = new CustomEvent(SDK_RECREATION_EVENT, {
          detail: { session, timestamp: Date.now() },
        })
        window.dispatchEvent(event)

        if (import.meta.env.DEV) {
          console.log(
            '[Visibility] ✅ SDK recreated',
            session ? '(session restored)' : '(no session)'
          )
        }
      } catch (recreateError) {
        console.error('[Visibility] ❌ Recreation failed:', recreateError)

        // Dernier recours après délai
        if (import.meta.env.DEV) {
          console.warn('[Visibility] 🔄 Will reload page in 2s...')
        }
        setTimeout(() => window.location.reload(), 2000)
      }
    }
  }

  document.addEventListener('visibilitychange', visibilityHandler)

  if (import.meta.env.DEV) {
    console.log('[Visibility] 👁️ Started monitoring (PRAGMATIC mode)')
  }
}

/**
 * Arrête l'écoute
 */
export function stopVisibilityHandler(): void {
  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null

    if (import.meta.env.DEV) {
      console.log('[Visibility] 👁️ Stopped monitoring')
    }
  }
}
