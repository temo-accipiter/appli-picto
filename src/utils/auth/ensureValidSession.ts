// src/utils/auth/ensureValidSession.ts
// Helper : S'assure que la session Supabase est valide avant opération critique

import { supabase } from '@/utils/supabaseClient'
import type { Session } from '@supabase/supabase-js'

interface EnsureValidSessionOptions {
  marginMinutes?: number
}

/**
 * Vérifie et refresh la session si nécessaire
 *
 * @param options - Options
 * @param options.marginMinutes - Marge avant expiration pour refresh préventif (défaut: 5)
 * @returns Session valide
 * @throws Error - Si session invalide ou impossible à refresh
 *
 * @example
 * try {
 *   await ensureValidSession()
 *   // Session OK → continuer opération
 * } catch (error) {
 *   console.error('Session invalide:', error)
 *   // Rediriger vers login ou afficher toast
 * }
 */
export async function ensureValidSession(
  options: EnsureValidSessionOptions = {}
): Promise<Session> {
  const { marginMinutes = 5 } = options

  try {
    // Récupérer session actuelle
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error(
        '❌ [ensureValidSession] Erreur récupération session:',
        sessionError
      )
      throw new Error(
        `Impossible de récupérer la session: ${sessionError.message}`
      )
    }

    if (!session) {
      console.error('❌ [ensureValidSession] Aucune session active')
      throw new Error('Non authentifié - aucune session active')
    }

    // Vérifier expiration (avec marge de sécurité)
    const expiresAtMs = (session.expires_at ?? 0) * 1000
    const nowMs = Date.now()
    const marginMs = marginMinutes * 60 * 1000
    const timeUntilExpiryMs = expiresAtMs - nowMs

    // 🔍 Debug logs

    // Si token expire bientôt → refresh préventif
    if (timeUntilExpiryMs < marginMs) {
      console.warn(
        `⚠️ [ensureValidSession] Token expire dans ${Math.round(timeUntilExpiryMs / 1000 / 60)} min → refresh préventif...`
      )

      try {
        // 🆕 Timeout 10s pour éviter blocage infini
        const refreshPromise = supabase.auth.refreshSession()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout refresh session (10s)')),
            10000
          )
        )

        const {
          data: { session: newSession },
          error: refreshError,
        } = await Promise.race([refreshPromise, timeoutPromise])

        if (refreshError) {
          console.error(
            '❌ [ensureValidSession] Erreur refresh session:',
            refreshError
          )
          // 🆕 Non bloquant : continuer avec session actuelle si proche expiration
          console.warn(
            '⚠️ [ensureValidSession] Continuant avec session actuelle malgré échec refresh'
          )
          return session
        }

        if (!newSession) {
          console.error('❌ [ensureValidSession] Refresh retourné session null')
          console.warn(
            '⚠️ [ensureValidSession] Continuant avec session actuelle'
          )
          return session
        }

        return newSession
      } catch (refreshError) {
        console.error(
          '💥 [ensureValidSession] Exception refresh:',
          refreshError
        )
        console.warn(
          '⚠️ [ensureValidSession] Continuant avec session actuelle (fallback)'
        )
        return session
      }
    }

    // Session valide et pas besoin de refresh
    return session
  } catch (error) {
    // Remonter l'erreur avec contexte
    console.error('💥 [ensureValidSession] Exception:', error)
    throw error
  }
}

/**
 * Vérifie si l'utilisateur est authentifié (version simple)
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return !!session
  } catch {
    return false
  }
}
