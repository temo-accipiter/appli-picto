import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { withAbortSafe, isAbortLike, useAuth } from '@/hooks'
import type { Database } from '@/types/supabase'

/**
 * Types pour account_preferences
 */
type AccountPreferences =
  Database['public']['Tables']['account_preferences']['Row']
type PreferencesUpdate =
  Database['public']['Tables']['account_preferences']['Update']

interface UpdateResult {
  ok: boolean
  error: unknown
}

interface UseAccountPreferencesReturn {
  preferences: AccountPreferences | null
  loading: boolean
  error: unknown
  updatePreferences: (updates: PreferencesUpdate) => Promise<UpdateResult>
  refresh: () => Promise<void>
}

/**
 * Hook pour gérer les préférences utilisateur via account_preferences
 * Remplace useParametres (legacy table parametres)
 *
 * Fonctionnalités :
 * - Lecture préférences depuis account_preferences (RLS self-only)
 * - Mise à jour avec validation DB-side (trigger accessibility guard)
 * - Auto-create row via trigger DB (pas besoin insert manuel)
 *
 * Règles DB-first :
 * - reduced_motion=true FORCE confetti_enabled=false (trigger)
 * - RLS self-only : auth.uid() = account_id
 * - Trigger auto-create on account insert
 *
 * @returns Préférences, loading, error, updatePreferences
 */
export default function useAccountPreferences(): UseAccountPreferencesReturn {
  const { user, authReady } = useAuth()
  const [preferences, setPreferences] = useState<AccountPreferences | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  /**
   * Fetch préférences depuis DB
   */
  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const {
      data,
      error: fetchError,
      aborted,
    } = await withAbortSafe(
      supabase
        .from('account_preferences')
        .select('*')
        .eq('account_id', user.id)
        .maybeSingle()
    )

    if (aborted || (fetchError && isAbortLike(fetchError))) {
      setLoading(false)
      return
    }

    if (fetchError) {
      console.error('Erreur fetch account_preferences:', fetchError)
      setError(fetchError)
      setLoading(false)
      return
    }

    // Si null, le trigger DB créera automatiquement la row au prochain insert
    // Ou on peut attendre que l'utilisateur modifie une préférence
    setPreferences(data || null)
    setLoading(false)
  }, [user])

  /**
   * Mise à jour préférences
   * Utilise upsert pour créer la row si elle n'existe pas (idempotent)
   *
   * Note : Le trigger DB "enforce_accessibility" force confetti_enabled=false
   * si reduced_motion=true, donc pas besoin de validation côté front
   */
  const updatePreferences = useCallback(
    async (updates: PreferencesUpdate): Promise<UpdateResult> => {
      if (!user) {
        return { ok: false, error: 'User not authenticated' }
      }

      try {
        // Upsert avec account_id pour créer row si n'existe pas
        const payload = {
          account_id: user.id,
          ...updates,
        }

        const { data, error: updateError } = await supabase
          .from('account_preferences')
          .upsert(payload, { onConflict: 'account_id' })
          .select()
          .single()

        if (updateError) {
          console.error('Erreur update account_preferences:', updateError)
          return { ok: false, error: updateError }
        }

        // Mettre à jour l'état local
        setPreferences(data)
        return { ok: true, error: null }
      } catch (err) {
        console.error('Erreur update account_preferences:', err)
        return { ok: false, error: err }
      }
    },
    [user]
  )

  /**
   * Effet pour charger préférences au montage
   */
  useEffect(() => {
    // Attendre que l'auth soit prête avant de charger
    if (!authReady) return

    fetchPreferences()
  }, [authReady, fetchPreferences])

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refresh: fetchPreferences,
  }
}
