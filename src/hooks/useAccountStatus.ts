/**
 * Hook de lecture du statut utilisateur depuis accounts.status
 *
 * ⚠️ USAGE COSMÉTIQUE UNIQUEMENT
 * Ce hook est destiné à l'affichage UI (badges, labels, messages),
 * PAS à l'autorisation ou au contrôle d'accès.
 *
 * L'autorisation est gérée par la DB via RLS (DB-first).
 *
 * @example
 * ```tsx
 * const { status, isFree, isSubscriber, isAdmin, loading } = useAccountStatus()
 *
 * // ✅ CORRECT - Affichage cosmétique
 * if (isFree) {
 *   return <Badge>Gratuit</Badge>
 * }
 *
 * // ❌ INTERDIT - Source d'autorisation
 * if (isFree) {
 *   return null // Ne pas bloquer côté front
 * }
 * // ✅ Toujours tenter l'action → gérer refus DB proprement
 * ```
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { withAbortSafe, isAbortLike } from '@/hooks'
import useAuth from './useAuth'
import type { Database } from '@/types/supabase'

type AccountStatus = Database['public']['Enums']['account_status']

interface UseAccountStatusReturn {
  /** Statut utilisateur : 'free' | 'subscriber' | 'admin' | null si non connecté */
  status: AccountStatus | null
  /** État de chargement */
  loading: boolean
  /** Erreur éventuelle */
  error: Error | null
  /** Helper : utilisateur gratuit */
  isFree: boolean
  /** Helper : utilisateur abonné */
  isSubscriber: boolean
  /** Helper : utilisateur admin */
  isAdmin: boolean
}

/**
 * Hook de lecture du statut utilisateur depuis la table accounts
 *
 * ⚠️ RÈGLES CRITIQUES :
 * - Usage COSMÉTIQUE uniquement (affichage UI)
 * - NE PAS utiliser pour autorisation (DB-first via RLS)
 * - Si non connecté : status = null (Visitor = état applicatif local)
 */
export default function useAccountStatus(): UseAccountStatusReturn {
  const { user, authReady } = useAuth()

  const [status, setStatus] = useState<AccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Si auth pas prête ou pas d'user → Visitor (local-only)
    if (!authReady || !user) {
      setStatus(null)
      setLoading(false)
      return
    }

    // Fetch account status depuis DB
    return withAbortSafe(async signal => {
      try {
        const { data, error: fetchError } = await supabase
          .from('accounts')
          .select('status')
          .eq('id', user.id)
          .abortSignal(signal)
          .single()

        if (fetchError) {
          throw fetchError
        }

        setStatus(data?.status || 'free') // Fallback 'free' si absent
      } catch (err) {
        // Ignorer erreurs d'annulation (composant démonté)
        if (isAbortLike(err)) {
          return
        }

        console.error('[useAccountStatus] Erreur lecture accounts.status:', err)
        setError(err as Error)
        setStatus('free') // Fallback sécurisé en cas d'erreur
      } finally {
        setLoading(false)
      }
    })
  }, [user, authReady])

  return {
    status,
    loading,
    error,
    isFree: status === 'free',
    isSubscriber: status === 'subscriber',
    isAdmin: status === 'admin',
  }
}
