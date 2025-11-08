import { isAbortLike, withAbortSafe, useAuth } from '@/hooks'
import type { Parametre } from '@/types/global'
import { supabase } from '@/utils/supabaseClient'
import { useCallback, useEffect, useState } from 'react'

interface UpdateResult {
  ok: boolean
  error: unknown
}

interface UseParametresReturn {
  parametres: Parametre | null
  error: unknown
  loading: boolean
  refresh: (autoInit?: boolean) => Promise<void>
  insertDefaults: (defaults?: Partial<Parametre>) => Promise<UpdateResult>
  updateParametres: (updates: Partial<Parametre>) => Promise<UpdateResult>
}

export default function useParametres(reload = 0): UseParametresReturn {
  const { authReady } = useAuth()
  const [parametres, setParametres] = useState<Parametre | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  const isCorsAccessControl = (err: unknown): boolean => {
    const msg = String((err as Error)?.message ?? err).toLowerCase()
    // Safari/Firefox typiques
    return (
      msg.includes('access control checks') ||
      msg.includes('load failed') ||
      msg.includes('networkerror') ||
      msg.includes('failed to fetch')
    )
  }

  const fetchParametres = useCallback(async (autoInit = false) => {
    setLoading(true)
    setError(null)

    const { data, error, aborted } = await withAbortSafe(
      supabase.from('parametres').select('*').eq('id', 1).maybeSingle()
    )

    if (aborted || (error && isAbortLike(error))) {
      // abort/transitoire : on ne log pas en rouge
      setLoading(false)
      return
    }

    if (error) {
      // Important: si c'est un blocage CORS Safari, ne pas tenter l'insert par défaut.
      if (isCorsAccessControl(error)) {
        if (import.meta.env.DEV) {
          console.info(
            'useParametres: blocage CORS/ITP détecté (Safari). Re-essai/ignorer.'
          )
        }
        setError(error)
        setLoading(false)
        return
      }

      // Vrai error PostgREST (hors "pas trouvé")
      if (error.code && error.code !== 'PGRST116') {
        setError(error)
        setLoading(false)
        return
      }
    }

    // Pas d'erreur bloquante → data peut être null si la ligne n'existe pas
    if (!data) {
      if (autoInit) {
        // Auto-initialiser avec les valeurs par défaut
        if (import.meta.env.DEV) {
          console.info(
            'useParametres: row not found, auto-initializing defaults'
          )
        }
        setLoading(false)

        // Créer la row avec les defaults
        const payload: Partial<Parametre> = { id: 1, confettis: true, toasts_enabled: true }
        const { error: insertError } = await withAbortSafe(
          supabase.from('parametres').upsert(payload, { onConflict: 'id' })
        )

        if (!insertError) {
          setParametres(payload as Parametre)
        }
      } else {
        setParametres(null)
        setLoading(false)
      }
      return
    }

    setParametres(data as Parametre)
    setLoading(false)
  }, [])

  // Insert "par défaut" seulement si on sait que la SELECT a abouti (pas un blocage CORS)
  const insertDefaults = useCallback(
    async (defaults: Partial<Parametre> = {}): Promise<UpdateResult> => {
      const payload: Partial<Parametre> = { id: 1, ...defaults }

      const { error, aborted } = await withAbortSafe(
        supabase.from('parametres').upsert(payload, { onConflict: 'id' })
      )

      if (aborted || (error && isAbortLike(error)))
        return { ok: false, error: null }
      if (error) {
        if (import.meta.env.DEV) {
          console.error(
            'Erreur insertion paramètres par défaut :',
            String((error as Error)?.message ?? error)
          )
        }
        return { ok: false, error }
      }

      // re-charge pour refléter la DB
      await fetchParametres()
      return { ok: true, error: null }
    },
    [fetchParametres]
  )

  useEffect(() => {
    // ✅ CORRECTIF : Attendre que l'auth soit prête avant de charger
    if (!authReady) return
    // Auto-initialiser si la row n'existe pas
    fetchParametres(true)
  }, [reload, authReady, fetchParametres])

  // Fonction pour mettre à jour les paramètres
  const updateParametres = useCallback(
    async (updates: Partial<Parametre>): Promise<UpdateResult> => {
      if (!parametres) {
        // Si pas de paramètres, créer avec les valeurs par défaut
        const defaults: Partial<Parametre> = { confettis: true, toasts_enabled: true, ...updates }
        return await insertDefaults(defaults)
      }

      const payload = { ...parametres, ...updates }

      const { error, aborted } = await withAbortSafe(
        supabase.from('parametres').upsert(payload, { onConflict: 'id' })
      )

      if (aborted || (error && isAbortLike(error)))
        return { ok: false, error: null }
      if (error) {
        if (import.meta.env.DEV) {
          console.error(
            'Erreur mise à jour paramètres :',
            String((error as Error)?.message ?? error)
          )
        }
        return { ok: false, error }
      }

      // Mettre à jour l'état local
      setParametres(payload)
      return { ok: true, error: null }
    },
    [parametres, insertDefaults]
  )

  return {
    parametres,
    error,
    loading,
    refresh: fetchParametres,
    insertDefaults,
    updateParametres,
  }
}
