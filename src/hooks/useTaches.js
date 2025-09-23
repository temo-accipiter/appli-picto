// src/hooks/useTaches.js
import { useEffect, useState } from 'react'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'
import { withAbortSafe, isAbortLike } from '@/hooks'

// Log "safe" pour Safari/Firefox
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

  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      const { data, error, aborted } = await withAbortSafe(
        supabase
          .from('taches')
          .select('*')
          .eq('user_id', user.id)
          .order('position', { ascending: true })
      )

      if (aborted || (error && isAbortLike(error))) return
      if (error) {
        console.error(`❌ Erreur fetch taches Supabase : ${formatErr(error)}`)
        return
      }

      setTaches(Array.isArray(data) ? data : [])
    })()
  }, [reload, user?.id])

  const toggleFait = async (id, current) => {
    const { error, aborted } = await withAbortSafe(
      supabase
        .from('taches')
        .update({ fait: !current })
        .eq('id', id)
        .eq('user_id', user.id)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur update fait : ${formatErr(error)}`)
      return
    }
    setTaches(prev =>
      prev.map(t => (t.id === id ? { ...t, fait: current ? 0 : 1 } : t))
    )
  }

  const resetFait = async () => {
    const { error, aborted } = await withAbortSafe(
      supabase.from('taches').update({ fait: false }).eq('user_id', user.id)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur reset fait : ${formatErr(error)}`)
      return
    }
    setTaches(prev => prev.map(t => ({ ...t, fait: 0 })))
  }

  const updatePosition = async ordered => {
    // On garde ta logique mais on sécurise chaque update
    await Promise.all(
      ordered.map((t, idx) =>
        withAbortSafe(
          supabase
            .from('taches')
            .update({ position: idx })
            .eq('id', t.id)
            .eq('user_id', user.id)
        ).then(({ error, aborted }) => {
          if (aborted || (error && isAbortLike(error))) return
          if (error) {
            console.error(
              `❌ Erreur update position tâche ${t.id} : ${formatErr(error)}`
            )
          }
        })
      )
    )
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
      const { error: storageError, aborted: storageAborted } =
        await withAbortSafe(supabase.storage.from('images').remove([imagePath]))
      if (!storageAborted && storageError) {
        console.warn(`⚠️ Erreur suppression image : ${formatErr(storageError)}`)
      } else if (!storageAborted) {
        console.log('🗑️ Image Supabase supprimée avec succès')
      }
    }

    const { error, aborted } = await withAbortSafe(
      supabase.from('taches').delete().eq('id', id).eq('user_id', user.id)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur suppression tâche : ${formatErr(error)}`)
      return
    }

    console.log('✅ Tâche supprimée avec succès')
    setTaches(prev => prev.filter(task => task.id !== id))
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
