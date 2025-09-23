import { isAbortLike, withAbortSafe } from '@/hooks'
import { supabase } from '@/utils'
import { useCallback, useEffect, useState } from 'react'

export default function useParametres(reload = 0) {
  const [parametres, setParametres] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const isCorsAccessControl = err => {
    const msg = String(err?.message ?? err).toLowerCase()
    // Safari/Firefox typiques
    return (
      msg.includes('access control checks') ||
      msg.includes('load failed') ||
      msg.includes('networkerror') ||
      msg.includes('failed to fetch')
    )
  }

  const fetchParametres = useCallback(async () => {
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
      // Important: si c’est un blocage CORS Safari, ne pas tenter l’insert par défaut.
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

    // Pas d’erreur bloquante → data peut être null si la ligne n’existe pas
    if (!data) {
      setParametres(null)
      setLoading(false)
      return
    }

    setParametres(data)
    setLoading(false)
  }, [])

  // Insert “par défaut” seulement si on sait que la SELECT a abouti (pas un blocage CORS)
  const insertDefaults = useCallback(
    async (defaults = {}) => {
      const payload = { id: 1, ...defaults }

      const { error, aborted } = await withAbortSafe(
        supabase.from('parametres').upsert(payload, { onConflict: 'id' })
      )

      if (aborted || (error && isAbortLike(error)))
        return { ok: false, error: null }
      if (error) {
        if (import.meta.env.DEV) {
          console.error(
            'Erreur insertion paramètres par défaut :',
            String(error?.message ?? error)
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
    fetchParametres()
  }, [reload, fetchParametres])

  // Fonction pour mettre à jour les paramètres
  const updateParametres = useCallback(
    async updates => {
      if (!parametres) {
        // Si pas de paramètres, créer avec les valeurs par défaut
        const defaults = { confettis: true, ...updates }
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
            String(error?.message ?? error)
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
