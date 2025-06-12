import { useEffect, useState } from 'react'

export default function useParametres() {
  const [parametres, setParametres] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchParametres = async () => {
    try {
      const res = await fetch('http://localhost:3001/parametres')
      const data = await res.json()
      setParametres(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const updateParametres = async (newParams) => {
    try {
      const res = await fetch('http://localhost:3001/parametres', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParams),
      })
      if (!res.ok) throw new Error('Erreur API')
      await fetchParametres()
    } catch (err) {
      setError(err)
    }
  }

  useEffect(() => {
    fetchParametres()
  }, [])

  return { parametres, loading, error, updateParametres }
}
