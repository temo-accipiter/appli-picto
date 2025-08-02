/*
import { useEffect, useState } from 'react'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'

export default function useTaches(reload = 0) {
  const [taches, setTaches] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    supabase
      .from('taches')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Erreur fetch taches Supabase :', error)
        else setTaches(data)
      })
  }, [reload, user?.id])

  const toggleFait = (id, current) =>
    supabase
      .from('taches')
      .update({ fait: !current })
      .eq('id', id)
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) return console.error('Erreur update fait :', error)
        setTaches((prev) =>
          prev.map((t) => (t.id === id ? { ...t, fait: current ? 0 : 1 } : t))
        )
      })

  const resetFait = () =>
    supabase
      .from('taches')
      .update({ fait: false })
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) return console.error('Erreur reset fait :', error)
        setTaches((prev) => prev.map((t) => ({ ...t, fait: 0 })))
      })

  const updatePosition = (ordered) => {
    ordered.forEach((t, idx) => {
      supabase
        .from('taches')
        .update({ position: idx })
        .eq('id', t.id)
        .eq('user_id', user.id)
        .catch((error) =>
          console.error(`Erreur update position tâche ${t.id} :`, error)
        )
    })
    setTaches(ordered)
  }

  const deleteTache = async (t) => {
    const id = Number(t?.id)
    const imagePath = t?.imagepath

    if (!id || isNaN(id)) {
      console.error('❌ ID invalide :', id)
      return
    }

    if (imagePath) {
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([imagePath])
      if (storageError) {
        console.error('❌ Erreur suppression image :', storageError)
      } else {
        console.log('🗑️ Image Supabase supprimée')
      }
    }

    const { error } = await supabase
      .from('taches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ Erreur DELETE tâche :', error)
    } else {
      setTaches((prev) => prev.filter((task) => task.id !== id))
    }
  }

  return {
    taches,
    setTaches,
    toggleFait,
    resetFait,
    updatePosition,
    deleteTache, // ✅ exporté
  }
}
*/
import { useEffect, useState } from 'react'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'

export default function useTaches(reload = 0) {
  const [taches, setTaches] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    supabase
      .from('taches')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('❌ Erreur fetch taches Supabase :', error)
        else setTaches(data)
      })
  }, [reload, user?.id])

  const toggleFait = (id, current) =>
    supabase
      .from('taches')
      .update({ fait: !current })
      .eq('id', id)
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) return console.error('❌ Erreur update fait :', error)
        setTaches(prev =>
          prev.map(t => (t.id === id ? { ...t, fait: current ? 0 : 1 } : t))
        )
      })

  const resetFait = () =>
    supabase
      .from('taches')
      .update({ fait: false })
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) return console.error('❌ Erreur reset fait :', error)
        setTaches(prev => prev.map(t => ({ ...t, fait: 0 })))
      })

  const updatePosition = ordered => {
    ordered.forEach((t, idx) => {
      supabase
        .from('taches')
        .update({ position: idx })
        .eq('id', t.id)
        .eq('user_id', user.id)
        .catch(error =>
          console.error(`❌ Erreur update position tâche ${t.id} :`, error)
        )
    })
    setTaches(ordered)
  }

  const deleteTache = async t => {
    const id = typeof t === 'string' ? t : t?.id
    const imagePath = t?.imagepath

    if (!id) {
      console.error('❌ Tâche invalide :', t)
      return
    }

    if (imagePath) {
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([imagePath])
      if (storageError) {
        console.warn('⚠️ Erreur suppression image :', storageError)
      } else {
        console.log('🗑️ Image Supabase supprimée avec succès')
      }
    }

    const { error } = await supabase
      .from('taches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ Erreur suppression tâche :', error)
    } else {
      console.log('✅ Tâche supprimée avec succès')
      setTaches(prev => prev.filter(task => task.id !== id))
    }
  }

  return {
    taches,
    setTaches,
    toggleFait,
    resetFait,
    updatePosition,
    deleteTache,
  }
}
