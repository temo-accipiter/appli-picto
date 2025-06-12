import { useEffect, useState, useMemo } from 'react'

export default function useStations(ligne = '1') {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoading(true)
        const res = await fetch(`http://localhost:3001/stations?ligne=${ligne}`)
        const data = await res.json()
        setStations(data.map((s) => s.nom))
        setLoading(false)
      } catch (err) {
        console.error('Erreur fetch stations:', err)
        setError(err)
        setLoading(false)
      }
    }

    fetchStations()
  }, [ligne])

  const shuffled = useMemo(() => {
    if (stations.length === 0) return []
    const start = Math.floor(Math.random() * stations.length)
    return [...stations.slice(start), ...stations.slice(0, start)]
  }, [stations])

  return { stations: shuffled, loading, error }
}
