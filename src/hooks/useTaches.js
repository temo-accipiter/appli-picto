// src/hooks/useTaches.js
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient' // ✅ instance unique
import { useAuth } from '@/hooks'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny' // ✅ utilitaire commun

// Log d'erreur "safe"
const formatErr = e => {
  const m = String(e?.message ?? e)
  const parts = [
    m,
    e?.code ? `[${e.code}]` : '',
    e?.details ? `— ${e.details}` : '',
    e?.hint ? `(hint: ${e.hint})` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

export default function useTaches(reload = 0) {
  const [taches, setTaches] = useState([])
  const { user } = useAuth()

  // 📥 Chargement initial
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('taches')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(`❌ Erreur fetch taches Supabase : ${formatErr(error)}`)
        } else {
          // ✅ Normalise en booléens côté front
          const norm = (data || []).map(t => ({
            ...t,
            aujourdhui: !!t.aujourdhui,
            fait: !!t.fait,
          }))
          setTaches(norm)
        }
      })
  }, [reload, user?.id])

  // ✅ Toggle "fait" (DB en bool, état local en bool)
  const toggleFait = (id, current) =>
    supabase
      .from('taches')
      .update({ fait: !current })
      .eq('id', id)
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error)
          return console.error(`❌ Erreur update fait : ${formatErr(error)}`)
        setTaches(prev =>
          prev.map(t => (t.id === id ? { ...t, fait: !current } : t))
        )
      })

  // ♻️ Reset "fait"
  const resetFait = () =>
    supabase
      .from('taches')
      .update({ fait: false })
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error)
          return console.error(`❌ Erreur reset fait : ${formatErr(error)}`)
        setTaches(prev => prev.map(t => ({ ...t, fait: false })))
      })

  // ↕️ Mise à jour de l’ordre
  const updatePosition = ordered => {
    ordered.forEach((t, idx) => {
      supabase
        .from('taches')
        .update({ position: idx })
        .eq('id', t.id)
        .eq('user_id', user.id)
        .catch(error =>
          console.error(
            `❌ Erreur update position tâche ${t.id} : ${formatErr(error)}`
          )
        )
    })
    setTaches(ordered)
  }

  // 🗑️ Suppression (avec image associée si présente)
  const deleteTache = async t => {
    const id = typeof t === 'string' ? t : t?.id
    const imagePath = t?.imagepath

    if (!id) {
      console.error('❌ Tâche invalide :', t)
      return
    }

    if (imagePath) {
      const { deleted, error } = await deleteImageIfAny(imagePath)
      if (error) console.warn('⚠️ Erreur suppression image :', formatErr(error))
      else if (deleted) console.log('🗑️ Image Supabase supprimée')
    }

    const { error } = await supabase
      .from('taches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error(`❌ Erreur suppression tâche : ${formatErr(error)}`)
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
