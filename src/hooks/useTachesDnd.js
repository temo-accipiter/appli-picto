import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'

export default function useTachesDnd(onChange) {
  const [taches, setTaches] = useState([])
  const [doneMap, setDone] = useState({})
  const { user } = useAuth()

  const loadTaches = useCallback(() => {
    if (!user?.id) return

    supabase
      .from('taches')
      .select('*')
      .eq('user_id', user.id) // 🔐 visibilité sécurisée
      .eq('aujourdhui', true)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (error) return console.error('❌ Erreur fetch Supabase :', error)

        setTaches(data)

        const initDone = Object.fromEntries(
          data.map(t => [t.id, t.fait === true || t.fait === 1])
        )
        setDone(initDone)

        const doneCount = Object.values(initDone).filter(Boolean).length
        onChange(doneCount, data.length)
      })
  }, [onChange, user?.id])

  useEffect(() => {
    loadTaches()
  }, [loadTaches])

  const toggleDone = (id, wasDone) => {
    supabase
      .from('taches')
      .update({ fait: !wasDone })
      .eq('id', id)
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) return console.error(error)

        const updated = { ...doneMap, [id]: !wasDone }
        setDone(updated)

        const count = Object.values(updated).filter(Boolean).length
        onChange(count, taches.length)
      })
  }

  const resetAll = () => {
    supabase
      .from('taches')
      .update({ fait: false })
      .eq('aujourdhui', true)
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) return console.error(error)

        const reset = Object.fromEntries(taches.map(t => [t.id, false]))
        setDone(reset)
        onChange(0, taches.length)
      })
  }

  const moveTask = (activeId, overId) => {
    let newList = []
    setTaches(prev => {
      const oldIndex = prev.findIndex(t => t.id.toString() === activeId)
      const newIndex = prev.findIndex(t => t.id.toString() === overId)
      const arr = [...prev]
      const [moved] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, moved)
      newList = arr
      return arr
    })
    return newList
  }

  const saveOrder = list => {
    Promise.all(
      list.map((t, i) =>
        supabase
          .from('taches')
          .update({ position: i })
          .eq('id', t.id)
          .eq('user_id', user.id)
      )
    )
      .then(() => loadTaches())
      .catch(console.error)
  }

  return {
    taches,
    doneMap,
    toggleDone,
    resetAll,
    moveTask,
    saveOrder,
  }
}
