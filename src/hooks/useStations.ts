import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'

interface Station {
  id: string
  label: string
  ligne: string
  ordre: number
  type: string
  created_at: string
  updated_at: string
}

interface UseStationsReturn {
  stations: Station[]
  loading: boolean
  error: Error | null
}

export default function useStations(
  ligne: string = '1',
  type: string = 'metro'
): UseStationsReturn {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!ligne) return
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('stations')
        .select('id,label,ligne,ordre,type,created_at,updated_at')
        .eq('ligne', ligne)
        .eq('type', type) // ⬅️ nouveau filtre réseau
        .order('ordre', { ascending: true })

      if (err) {
        setError(err as unknown as Error)
        setStations([])
      } else {
        // Mélange optimisé : seulement la première station aléatoire
        const stationsData = (data || []) as Station[]
        if (stationsData.length > 1) {
          // Choisir une première station aléatoire
          const randomIndex = Math.floor(Math.random() * stationsData.length)
          const firstStation = stationsData[randomIndex]

          // Créer un nouveau tableau avec la première station aléatoire
          const remainingStations = stationsData.filter(
            (_, index) => index !== randomIndex
          )
          const shuffledStations = [firstStation, ...remainingStations] as Station[]

          setStations(shuffledStations)
        } else {
          setStations(stationsData)
        }
      }
      setLoading(false)
    })()
  }, [ligne, type])

  return { stations, loading, error }
}
