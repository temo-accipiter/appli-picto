import { useState, useEffect } from 'react'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'
import { withAbortSafe, isAbortLike } from '@/hooks'

// sérialise proprement les erreurs pour éviter les soucis d’inspecteur Safari
const formatErr = (e) => {
  const m = String(e?.message ?? e)
  const parts = [
    m,
    e?.code ? `[${e.code}]` : '',
    e?.details ? `— ${e.details}` : '',
    e?.hint ? `(hint: ${e.hint})` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

export default function useTachesEdition(reload = 0) {
  const [taches, setTaches] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    ;(async () => {
      const { data, error, aborted } = await withAbortSafe(
        supabase.from('taches').select('*').eq('user_id', user.id)
      )

      if (aborted || (error && isAbortLike(error))) return

      if (error) {
        console.error(`❌ Erreur fetch Supabase : ${formatErr(error)}`)
        return
      }

      setTaches(Array.isArray(data) ? data : [])
    })()
  }, [reload, user?.id])

  const toggleAujourdhui = async (id, current) => {
    const { error, aborted } = await withAbortSafe(
      supabase
        .from('taches')
        .update({ aujourdhui: !current, fait: false })
        .eq('id', id)
        .eq('user_id', user.id)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur toggle aujourdhui : ${formatErr(error)}`)
      return
    }
    setTaches((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, aujourdhui: !current ? 1 : 0, fait: 0 } : t
      )
    )
  }

  const updateLabel = async (id, label) => {
    const { error, aborted } = await withAbortSafe(
      supabase.from('taches').update({ label }).eq('id', id).eq('user_id', user.id)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur update label : ${formatErr(error)}`)
      return
    }
    setTaches((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)))
  }

  const updateCategorie = async (id, categorie) => {
    const { error, aborted } = await withAbortSafe(
      supabase.from('taches').update({ categorie }).eq('id', id).eq('user_id', user.id)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur update catégorie : ${formatErr(error)}`)
      return
    }
    setTaches((prev) => prev.map((t) => (t.id === id ? { ...t, categorie } : t)))
  }

  const deleteTache = async (t) => {
    const id = typeof t === 'string' ? t : t?.id
    const imagePath = t?.imagepath

    if (!id) {
      console.error('❌ Tâche invalide :', t)
      return
    }

    // 1) supprimer l’image éventuelle (silence si abort)
    if (imagePath) {
      const { error: storageError, aborted: storageAborted } = await withAbortSafe(
        supabase.storage.from('images').remove([imagePath])
      )
      if (!storageAborted && storageError) {
        console.warn(`⚠️ Erreur suppression image : ${formatErr(storageError)}`)
      }
    }

    // 2) supprimer la tâche
    const { error, aborted } = await withAbortSafe(
      supabase.from('taches').delete().eq('id', id).eq('user_id', user.id)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur suppression tâche : ${formatErr(error)}`)
      return
    }

    setTaches((prev) => prev.filter((task) => task.id !== id))
  }

  const resetEdition = async () => {
    const { error, aborted } = await withAbortSafe(
      supabase
        .from('taches')
        .update({ aujourdhui: false })
        .eq('user_id', user.id)
        .neq('aujourdhui', false)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur resetEdition : ${formatErr(error)}`)
      return
    }
    setTaches((prev) => prev.map((t) => ({ ...t, aujourdhui: 0 })))
  }

  return {
    taches,
    toggleAujourdhui,
    updateLabel,
    updateCategorie,
    deleteTache,
    resetEdition,
  }
}
