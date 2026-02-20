/**
 * useDevices — Lecture et révocation des appareils du compte.
 *
 * ⚠️ RÈGLES DB-FIRST (S10)
 * - SELECT devices WHERE account_id = auth.uid() (via RLS)
 * - Révocation = UPDATE devices SET revoked_at = NOW() (non-destructif)
 * - DELETE interdit par RLS — jamais de tentative de suppression
 *
 * ⚠️ RÈGLES TSA
 * - Adulte uniquement (Page Profil) — jamais en Contexte Tableau
 * - Messages d'erreur simples et non techniques
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import useAuth from './useAuth'
import type { Database } from '@/types/supabase'

export type Device = Database['public']['Tables']['devices']['Row']

interface UseDevicesReturn {
  devices: Device[]
  loading: boolean
  error: Error | null
  /**
   * Révoquer un appareil par son identifiant DB (id = PK, pas device_id).
   * Non-destructif : UPDATE revoked_at = NOW().
   * Retourne { error: null } si succès, { error: Error } si échec.
   */
  revokeDevice: (id: string) => Promise<{ error: Error | null }>
}

export default function useDevices(): UseDevicesReturn {
  const { user, authReady } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!authReady) return

    if (!user) {
      setDevices([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchDevices = async () => {
      try {
        const { data, error: err } = await supabase
          .from('devices')
          .select('*')
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (err) throw err

        setDevices(data ?? [])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useDevices] Erreur lecture devices:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchDevices()
    return () => {
      controller.abort()
    }
  }, [user, authReady])

  /**
   * Révoquer un appareil — UPDATE revoked_at = NOW().
   * Met à jour l'état local de façon optimiste (UI réactive immédiate).
   * Jamais de DELETE (RLS interdit, contrat §5.2.1).
   */
  const revokeDevice = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      const revokedAt = new Date().toISOString()

      const { error: err } = await supabase
        .from('devices')
        .update({ revoked_at: revokedAt })
        .eq('id', id)

      if (err) {
        return { error: new Error(err.message) }
      }

      // Mise à jour locale optimiste — évite un refetch complet
      setDevices(prev =>
        prev.map(d => (d.id === id ? { ...d, revoked_at: revokedAt } : d))
      )

      return { error: null }
    },
    []
  )

  return { devices, loading, error, revokeDevice }
}
