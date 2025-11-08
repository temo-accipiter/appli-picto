// src/utils/supabaseClient.ts
import {
  createClient,
  type SupabaseClient,
  type Session,
} from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type SupabaseClientType = SupabaseClient<Database, 'public'>

// Interface pour étendre Window avec supabase
interface WindowWithSupabase extends Window {
  supabase?: SupabaseClientType
}

// Interface pour la session sauvegardée dans localStorage
interface SavedSession {
  access_token?: string
  refresh_token?: string
  [key: string]: unknown
}

// ⚠️ Point d'entrée unique du client Supabase pour TOUT le frontend.
const url =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://tklcztqoqvnialaqfcjm.supabase.co'

const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGN6dHFvcXZuaWFsYXFmY2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTM0NDEsImV4cCI6MjA2ODgyOTQ0MX0.O2H1eyrlUaq1K6d92j5uAGn3xzOaS0xroa4MagPna68'

// 🔍 DEBUG: Afficher quelle URL est utilisée
console.log('🔌 Supabase URL:', url)
console.log('🔑 Supabase Key (first 20 chars):', key.substring(0, 20) + '...')

let recreationInProgress = false

// Configuration SDK simple (sans hacks qui cassent PostgREST)
const clientConfig = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 🔑 CRITICAL: Stockage plus fiable
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: `sb-${url.split('//')[1].split('.')[0]}-auth-token`,
  },
  global: {
    // Timeout réduit pour détecter problèmes plus vite
    fetch: async (
      input: string | URL | Request,
      options: Record<string, unknown> = {}
    ) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000) // 5s max

      try {
        const response = await fetch(input, {
          ...options,
          signal: controller.signal,
        })
        clearTimeout(timeout)
        return response
      } catch (error) {
        clearTimeout(timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('[Supabase] Request timeout after 5s')
          throw new Error('Supabase timeout')
        }
        throw error
      }
    },
  },
}

// Instance unique
export let supabase: SupabaseClientType = createClient<Database>(
  url,
  key,
  clientConfig
)

// Exposer pour debug
if (typeof window !== 'undefined') {
  ;(window as WindowWithSupabase).supabase = supabase
}

interface RecreateResult {
  client: SupabaseClientType
  session: Session | null
}

/**
 * Recrée le client Supabase avec restauration de session AMÉLIORÉE
 *
 * @returns {Promise<object>} Le nouveau client + session restaurée
 */
export async function recreateSupabaseClient(): Promise<RecreateResult> {
  if (recreationInProgress) {
    if (import.meta.env.DEV) {
      console.log('[Supabase] ⏳ Recreation already in progress...')
    }
    // Attendre que l'autre recréation finisse
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      if (!recreationInProgress) break
    }
    return { client: supabase, session: null }
  }

  recreationInProgress = true

  try {
    if (import.meta.env.DEV) {
      console.log('[Supabase] 🔄 Recreating client...')
    }

    // 🔑 AMÉLIORATION : Sauvegarder TOUTES les données de session
    const storageKey = `sb-${url.split('//')[1].split('.')[0]}-auth-token`
    const savedSessionStr = localStorage.getItem(storageKey)

    let savedSession: SavedSession | null = null
    if (savedSessionStr) {
      try {
        savedSession = JSON.parse(savedSessionStr) as SavedSession
        if (import.meta.env.DEV) {
          console.log('[Supabase] 💾 Session saved from localStorage')
        }
      } catch (e) {
        console.warn('[Supabase] Failed to parse saved session:', e)
      }
    }

    // Cleanup ancien client (sans await pour éviter blocages)
    try {
      const oldChannels = supabase.realtime?.channels || {}
      Object.values(oldChannels).forEach(channel => {
        void channel.unsubscribe()
      })
      void supabase.realtime?.disconnect()
    } catch {
      // Ignore errors
    }

    // Détruire référence
    supabase = undefined as unknown as SupabaseClientType

    // Court délai
    await new Promise(resolve => setTimeout(resolve, 100))

    // Créer nouveau client
    supabase = createClient<Database>(url, key, clientConfig)

    // Exposer
    if (typeof window !== 'undefined') {
      ;(window as WindowWithSupabase).supabase = supabase
    }

    // 🔑 AMÉLIORATION : Restauration de session plus robuste
    let session: Session | null = null
    if (savedSession?.access_token && savedSession?.refresh_token) {
      try {
        // Essayer d'abord de restaurer directement
        const { data, error } = await supabase.auth.setSession({
          access_token: savedSession.access_token,
          refresh_token: savedSession.refresh_token,
        })

        if (!error && data?.session) {
          session = data.session
          if (import.meta.env.DEV) {
            console.log('[Supabase] ✅ Session restored successfully')
          }
        } else if (error) {
          // Si setSession échoue, essayer de refresh
          if (import.meta.env.DEV) {
            console.log('[Supabase] Trying to refresh token...')
          }

          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession({
              refresh_token: savedSession.refresh_token,
            })

          if (!refreshError && refreshData?.session) {
            session = refreshData.session
            if (import.meta.env.DEV) {
              console.log('[Supabase] ✅ Session refreshed successfully')
            }
          }
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        console.warn('[Supabase] Session restoration failed:', errorMsg)
      }
    }

    if (import.meta.env.DEV) {
      console.log(
        '[Supabase] ✅ Client recreated',
        session ? 'with session' : 'without session'
      )
    }

    return { client: supabase, session }
  } finally {
    recreationInProgress = false
  }
}

export default supabase
