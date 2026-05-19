import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import { isAbortLike } from '@/hooks/_net'
import type { Database } from '@/types/supabase'

type ProgressStation = Database['public']['Tables']['progress_stations']['Row']

interface UseProgressStationsReturn {
  stations: ProgressStation[]
  loading: boolean
  error: Error | null
}

/**
 * Hook lecture seule du catalogue progress_stations.
 *
 * Remplace useStations (table « stations » indexée par ligne RATP,
 * dépréciée — supprimée en Phase 5/6 de la refonte TrainProgressBar).
 *
 * Lecture déterministe : tri strict par position croissante, AUCUNE
 * randomisation ni cycle. La prévisibilité de l'ordre des arrêts est
 * une exigence UX TSA (anti-surprise).
 */
export default function useProgressStations(
  style: string = 'train-soleil'
): UseProgressStationsReturn {
  const [stations, setStations] = useState<ProgressStation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!style) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchStations = async () => {
      try {
        const { data, error: err } = await supabase
          .from('progress_stations')
          .select('style,position,label')
          .eq('style', style)
          .order('position', { ascending: true })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (err) throw err

        setStations((data ?? []) as ProgressStation[])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        setError(err as Error)
        setStations([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchStations()
    return () => {
      controller.abort()
    }
  }, [style])

  return { stations, loading, error }
}
