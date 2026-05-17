import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
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
 *
 * Pattern réseau aligné sur useStations (supabase.from direct, sans
 * AbortController). La migration vers withAbortSafe/isAbortLike reste
 * une dette hors périmètre de cette mission.
 */
export default function useProgressStations(
  style: string = 'train-soleil'
): UseProgressStationsReturn {
  const [stations, setStations] = useState<ProgressStation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!style) return
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('progress_stations')
        .select('style,position,label')
        .eq('style', style)
        .order('position', { ascending: true })

      if (err) {
        setError(err as unknown as Error)
        setStations([])
      } else {
        setStations((data ?? []) as ProgressStation[])
      }
      setLoading(false)
    })()
  }, [style])

  return { stations, loading, error }
}
