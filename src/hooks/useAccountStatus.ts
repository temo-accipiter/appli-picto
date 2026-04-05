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

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks'
import useAuth from './useAuth'
import type { Database } from '@/types/supabase'

type AccountStatus = Database['public']['Enums']['account_status']

interface StatusDisplay {
  /** Libellé affiché dans l'UI */
  label: string
  /** Icône optionnelle */
  icon: string
  /** Couleur sémantique : 'success' | 'default' | 'info' */
  color: string
}

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
  /** Affichage cosmétique du statut (label, icon, color) */
  statusDisplay: StatusDisplay
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
    const controller = new AbortController()

    const fetchStatus = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('accounts')
          .select('status')
          .eq('id', user.id)
          .abortSignal(controller.signal)
          .single()

        if (controller.signal.aborted) return

        if (fetchError) {
          throw fetchError
        }

        setStatus(data?.status || 'free') // Fallback 'free' si absent
      } catch (err) {
        // Ignorer erreurs d'annulation (composant démonté)
        if (controller.signal.aborted || isAbortLike(err)) return

        console.error('[useAccountStatus] Erreur lecture accounts.status:', err)
        setError(err as Error)
        setStatus('free') // Fallback sécurisé en cas d'erreur
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchStatus()

    return () => {
      controller.abort()
    }
  }, [user, authReady])

  const statusDisplay = useMemo<StatusDisplay>(() => {
    switch (status) {
      case 'subscriber':
        return { label: 'Actif', icon: '', color: 'success' }
      case 'free':
        return { label: 'Gratuit', icon: '', color: 'default' }
      case 'admin':
        return { label: 'Admin', icon: '', color: 'info' }
      default:
        return { label: 'Inconnu', icon: '', color: 'default' }
    }
  }, [status])

  return {
    status,
    loading,
    error,
    isFree: status === 'free',
    isSubscriber: status === 'subscriber',
    isAdmin: status === 'admin',
    statusDisplay,
  }
}
