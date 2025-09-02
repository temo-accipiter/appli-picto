import { useEffect, useState } from 'react'
import { supabase } from '@/utils'

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
        .select('id,label,ligne,ordre,type')
        .eq('ligne', ligne)
        .eq('type', type) // ⬅️ nouveau filtre réseau
        .order('ordre', { ascending: true })

      if (error) {
        setError(error)
        setStations([])
      } else {
        setStations(data || [])
      }
      setLoading(false)
    })()
  }, [ligne, type])

  return { stations, loading, error }
}
