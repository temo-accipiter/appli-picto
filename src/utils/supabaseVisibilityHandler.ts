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
      if (process.env.NODE_ENV === 'development') {
      }
      return
    }

    if (document.visibilityState !== 'visible') return

    const hiddenDuration = tabHiddenSince ? Date.now() - tabHiddenSince : 0
    tabHiddenSince = null

    if (process.env.NODE_ENV === 'development') {
    }

    // Skip si absence très courte
    if (hiddenDuration < MIN_HIDDEN_DURATION) {
      if (process.env.NODE_ENV === 'development') {
      }
      return
    }

    // 🔑 Éviter recréations en rafale
    const timeSinceLastRecreation = Date.now() - lastRecreationTime
    if (timeSinceLastRecreation < MIN_RECREATION_INTERVAL) {
      if (process.env.NODE_ENV === 'development') {
      }
      return
    }

    // Test API avec timeout court
    if (process.env.NODE_ENV === 'development') {
    }

    try {
      const supabaseUrl =
        (supabaseClient as unknown as SupabaseClientInternal).supabaseUrl ||
        process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey =
        (supabaseClient as unknown as SupabaseClientInternal).supabaseKey ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      // Vérifier que les clés sont définies
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials')
      }

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
        if (process.env.NODE_ENV === 'development') {
        }
        return
      } else {
        throw new Error(`API returned ${response.status}`)
      }
    } catch (apiError) {
      // API ne répond pas → Recréer
      if (process.env.NODE_ENV === 'development') {
        const errorMsg =
          apiError instanceof Error ? apiError.message : String(apiError)
        console.warn('[Visibility] ❌ API check failed:', errorMsg)
      }

      try {
        lastRecreationTime = Date.now()
        const { session } = await recreateSupabaseClient()

        // Notifier l'application
        const event = new CustomEvent(SDK_RECREATION_EVENT, {
          detail: { session, timestamp: Date.now() },
        })
        window.dispatchEvent(event)

        if (process.env.NODE_ENV === 'development') {
        }
      } catch (recreateError) {
        console.error('[Visibility] ❌ Recreation failed:', recreateError)

        // Dernier recours après délai
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Visibility] 🔄 Will reload page in 2s...')
        }
        setTimeout(() => window.location.reload(), 2000)
      }
    }
  }

  document.addEventListener('visibilitychange', visibilityHandler)

  if (process.env.NODE_ENV === 'development') {
  }
}

/**
 * Arrête l'écoute
 */
export function stopVisibilityHandler(): void {
  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null

    if (process.env.NODE_ENV === 'development') {
    }
  }
}
