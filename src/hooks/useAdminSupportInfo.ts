// src/hooks/useAdminSupportInfo.ts
/**
 * Hook pour accéder aux métadonnées support d'un compte via admin_get_account_support_info.
 *
 * Règles S12 §8.10 :
 * - Scope lecture uniquement : identité minimale + statut + compteurs
 * - JAMAIS d'image_url personnelle (fonction SQL garantit D2)
 * - Accès ciblé par account_id (pas de liste globale)
 * - Accessible uniquement si is_admin() (enforced côté DB)
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { withAbortSafe, isAbortLike, useAccountStatus } from '@/hooks'

// --- Types retournés par admin_get_account_support_info ---

export interface AdminSupportChildProfile {
  profile_id: string
  name: string
  status: string
  created_at: string
}

export interface AdminSupportAccountInfo {
  account: {
    account_id: string
    status: string
    timezone: string | null
    created_at: string
    updated_at: string
  }
  devices: {
    total_devices: number
    active_devices: number
    revoked_devices: number
  }
  profiles: {
    total_profiles: number
    active_profiles: number
    locked_profiles: number
    profiles: AdminSupportChildProfile[] | null
  }
  cards: {
    personal_cards_count: number
    personal_cards_current_month: number
    // Pas d'image_url (D2 - interdit §8.10)
  }
  sessions: {
    total_sessions: number
    active_sessions: number
    completed_sessions: number
  }
}

interface UseAdminSupportInfoReturn {
  info: AdminSupportAccountInfo | null
  loading: boolean
  error: unknown
  fetch: (accountId: string) => Promise<void>
  reset: () => void
}

/**
 * Accède aux métadonnées support d'un compte spécifique.
 * Requiert le statut admin (vérifié côté DB par is_admin()).
 *
 * Usage : fetch(accountId) pour charger, reset() pour vider.
 */
export default function useAdminSupportInfo(): UseAdminSupportInfoReturn {
  const { isAdmin } = useAccountStatus()
  const [info, setInfo] = useState<AdminSupportAccountInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  // Cleanup si l'utilisateur perd son statut admin
  useEffect(() => {
    if (!isAdmin) {
      setInfo(null)
      setError(null)
    }
  }, [isAdmin])

  const fetchInfo = useCallback(
    async (accountId: string) => {
      if (!isAdmin) return

      setLoading(true)
      setError(null)

      const {
        data,
        error: fetchError,
        aborted,
      } = await withAbortSafe(
        supabase.rpc('admin_get_account_support_info', {
          target_account_id: accountId,
        }) as any // eslint-disable-line @typescript-eslint/no-explicit-any
      )

      if (aborted || (fetchError && isAbortLike(fetchError))) {
        setLoading(false)
        return
      }

      if (fetchError) {
        console.error('[useAdminSupportInfo] Erreur RPC:', fetchError)
        setError(fetchError)
        setLoading(false)
        return
      }

      setInfo(data as AdminSupportAccountInfo | null)
      setLoading(false)
    },
    [isAdmin]
  )

  const reset = useCallback(() => {
    setInfo(null)
    setError(null)
  }, [])

  return {
    info,
    loading,
    error,
    fetch: fetchInfo,
    reset,
  }
}
