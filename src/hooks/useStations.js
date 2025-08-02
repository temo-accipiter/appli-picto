/*
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
*/
import { useEffect, useState } from 'react'
import { supabase } from '@/utils'

export default function useStations(ligne = '1') {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!ligne) return

    const fetchStations = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('stations')
        .select('id, label, ligne, ordre')
        .eq('ligne', ligne)
        .order('ordre', { ascending: true })

      if (error) {
        console.error('❌ Erreur fetch stations :', error)
        setError(error)
        setStations([])
      } else {
        console.log('✅ Stations chargées :', data)
        setStations(data || [])
      }

      setLoading(false)
    }

    fetchStations()
  }, [ligne])

  return { stations, loading, error }
}
