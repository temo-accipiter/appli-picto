import { useState, useEffect } from 'react'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'

export default function useTachesEdition(reload = 0) {
  const [taches, setTaches] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    supabase
      .from('taches')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) console.error('❌ Erreur fetch Supabase :', error)
        else setTaches(data)
      })
  }, [reload, user?.id])

  const toggleAujourdhui = (id, current) =>
    supabase
      .from('taches')
      .update({ aujourdhui: !current, fait: false })
      .eq('id', id)
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) return console.error('❌ Erreur toggle aujourdhui :', error)
        setTaches(prev =>
          prev.map(t =>
            t.id === id ? { ...t, aujourdhui: !current ? 1 : 0, fait: 0 } : t
          )
        )
      })

  const updateLabel = (id, label) =>
    supabase
      .from('taches')
      .update({ label })
      .eq('id', id)
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) return console.error('❌ Erreur update label :', error)
        setTaches(prev => prev.map(t => (t.id === id ? { ...t, label } : t)))
      })

  const updateCategorie = (id, categorie) =>
    supabase
      .from('taches')
      .update({ categorie })
      .eq('id', id)
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) return console.error('❌ Erreur update catégorie :', error)
        setTaches(prev =>
          prev.map(t => (t.id === id ? { ...t, categorie } : t))
        )
      })

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

  const resetEdition = () =>
    supabase
      .from('taches')
      .update({ aujourdhui: false })
      .eq('user_id', user.id)
      .neq('aujourdhui', false)
      .then(({ error }) => {
        if (error) return console.error('❌ Erreur resetEdition :', error)
        setTaches(prev => prev.map(t => ({ ...t, aujourdhui: 0 })))
      })

  return {
    taches,
    toggleAujourdhui,
    updateLabel,
    updateCategorie,
    deleteTache,
    resetEdition,
  }
}
