import { useEffect, useState } from 'react'
import { supabase } from '@/utils'

export default function useParametres(reload = 0) {
  const [parametres, setParametres] = useState(null)
  const [error, setError] = useState(null)

  const fetchParametres = async () => {
    const { data, error } = await supabase
      .from('parametres')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      setError(error)
      console.error('Erreur fetch paramètres :', error)
      return
    }

    if (!data) {
      setParametres(null)
      return
    }

    setParametres(data)
    setError(null)
  }

  const updateParametres = async newParams => {
    const { error } = await supabase
      .from('parametres')
      .update(newParams)
      .eq('id', 1)

    if (error) {
      setError(error)
      console.error('Erreur update paramètres :', error)
    } else {
      fetchParametres()
    }
  }

  useEffect(() => {
    fetchParametres()
  }, [reload]) // ✅ re-fetch à chaque changement de `reload`

  return { parametres, error, updateParametres }
}
