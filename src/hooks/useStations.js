import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'

export default function useStations(ligne = '1', type = 'metro') {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!ligne) return
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('stations')
        .select('id,label,ligne,ordre,type,created_at,updated_at')
        .eq('ligne', ligne)
        .eq('type', type) // ⬅️ nouveau filtre réseau
        .order('ordre', { ascending: true })

      if (error) {
        setError(error)
        setStations([])
      } else {
        // Mélange optimisé : seulement la première station aléatoire
        const stations = data || []
        if (stations.length > 1) {
          // Choisir une première station aléatoire
          const randomIndex = Math.floor(Math.random() * stations.length)
          const firstStation = stations[randomIndex]

          // Créer un nouveau tableau avec la première station aléatoire
          const remainingStations = stations.filter(
            (_, index) => index !== randomIndex
          )
          const shuffledStations = [firstStation, ...remainingStations]

          setStations(shuffledStations)
        } else {
          setStations(stations)
        }
      }
      setLoading(false)
    })()
  }, [ligne, type])

  return { stations, loading, error }
}
