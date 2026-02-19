/**
 * Hook de lecture et gestion des profils enfants (table child_profiles)
 *
 * ⚠️ DB-FIRST STRICT
 * - Aucune logique de quota côté client.
 * - Aucune règle métier : la DB refuse si la limite est atteinte.
 * - Le front gère proprement les refus DB.
 *
 * @example
 * ```tsx
 * const { profiles, loading, error, createProfile } = useChildProfiles()
 * ```
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import useAuth from './useAuth'
import type { Database } from '@/types/supabase'

export type ChildProfile = Database['public']['Tables']['child_profiles']['Row']
type ChildProfileInsert =
  Database['public']['Tables']['child_profiles']['Insert']

interface UseChildProfilesReturn {
  /** Liste des profils enfants du compte (triés par created_at ASC) */
  profiles: ChildProfile[]
  /** Chargement en cours */
  loading: boolean
  /** Erreur de lecture (non technique côté Tableau) */
  error: Error | null
  /** Rafraîchir la liste depuis la DB */
  refetch: () => void
  /**
   * Créer un nouveau profil enfant (best-effort DB-first).
   * Si la DB refuse (quota, constraint), retourne l'erreur sans exposer les règles.
   */
  createProfile: (
    name: string
  ) => Promise<{ profile: ChildProfile | null; error: string | null }>
}

/**
 * Hook DB-first pour les profils enfants.
 *
 * - Visitor (pas de user) → profiles = [], loading = false, pas d'appel DB.
 * - Auth → SELECT child_profiles ORDER BY created_at ASC.
 * - Création → INSERT simple, gère refus DB sans quota check côté client.
 */
export default function useChildProfiles(): UseChildProfilesReturn {
  const { user, authReady } = useAuth()

  const [profiles, setProfiles] = useState<ChildProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  // Compteur pour déclencher un refetch manuel
  const [fetchTick, setFetchTick] = useState(0)

  useEffect(() => {
    // Visitor ou auth pas encore prête → pas d'appel DB
    if (!authReady) {
      return
    }

    if (!user) {
      setProfiles([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    // Promise.resolve() : .abortSignal() retourne PromiseLike (pas Promise), donc
    // pas de .catch() natif — on enveloppe pour avoir un vrai Promise<void>.
    void Promise.resolve(
      supabase
        .from('child_profiles')
        .select('*')
        .order('created_at', { ascending: true })
        .abortSignal(controller.signal)
        .then(({ data, error: fetchError }) => {
          if (controller.signal.aborted) return

          if (fetchError) {
            // Ignorer les erreurs d'annulation (composant démonté)
            const msg = String(fetchError?.message ?? '').toLowerCase()
            if (msg.includes('aborted') || msg.includes('cancel')) return

            console.error('[useChildProfiles] Erreur lecture:', fetchError)
            setError(new Error(fetchError.message))
            setLoading(false)
            return
          }

          setProfiles(data ?? [])
          setLoading(false)
        })
    ).catch(err => {
      if (controller.signal.aborted) return
      const msg = String(err?.message ?? '').toLowerCase()
      if (msg.includes('aborted') || msg.includes('cancel')) return

      console.error('[useChildProfiles] Erreur inattendue:', err)
      setError(err as Error)
      setLoading(false)
    })

    return () => {
      controller.abort()
    }
  }, [user, authReady, fetchTick])

  const refetch = useCallback(() => {
    setFetchTick(t => t + 1)
  }, [])

  const createProfile = useCallback(
    async (
      name: string
    ): Promise<{ profile: ChildProfile | null; error: string | null }> => {
      if (!user) {
        return { profile: null, error: 'Non connecté' }
      }

      const insert: ChildProfileInsert = {
        account_id: user.id,
        name: name.trim(),
        status: 'active',
      }

      const { data, error: insertError } = await supabase
        .from('child_profiles')
        .insert(insert)
        .select('*')
        .single()

      if (insertError) {
        // Traduction des refus DB en message UX neutre (non technique)
        const code = insertError.code
        let message = 'Impossible de créer le profil. Réessaie plus tard.'

        // Quota/trigger atteint → message contractuel
        if (
          code === 'P0001' ||
          code === '23514' ||
          insertError.message?.includes('quota') ||
          insertError.message?.includes('limit') ||
          insertError.message?.includes('maximum')
        ) {
          message = 'Nombre maximum de profils enfants atteint.'
        }

        return { profile: null, error: message }
      }

      // Rafraîchir la liste après création réussie
      setFetchTick(t => t + 1)

      return { profile: data, error: null }
    },
    [user]
  )

  return {
    profiles,
    loading,
    error,
    refetch,
    createProfile,
  }
}
