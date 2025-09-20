import { isAbortLike, useAuth, withAbortSafe } from '@/hooks'
import { supabase } from '@/utils'
import { useEffect, useState } from 'react'

// Log d'erreur "safe" (évite les soucis d'inspection sous Safari)
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

export default function useRecompenses(reload = 0) {
  const [recompenses, setRecompenses] = useState([])
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    ;(async () => {
      const { data, error, aborted } = await withAbortSafe(
        supabase.from('recompenses').select('*').eq('user_id', userId)
      )
      if (aborted || (error && isAbortLike(error))) return
      if (error) {
        console.error(`❌ Erreur chargement récompenses: ${formatErr(error)}`)
        return
      }
      setRecompenses(Array.isArray(data) ? data : [])
    })()
  }, [reload, userId])

  const createRecompense = async ({ label, image }) => {
    let imagepath = ''

    // 1) Upload éventuel (silencieux si abort)
    if (image) {
      const cleanName = image.name
        ? image.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_.-]/g, '')
        : `${Date.now()}`
      const fileName = `${userId}/recompenses/${Date.now()}-${cleanName}`

      const { data, error: uploadError, aborted: uploadAborted } = await withAbortSafe(
        supabase.storage.from('images').upload(fileName, image)
      )
      if (uploadAborted) return
      if (uploadError) {
        console.error(`❌ Erreur upload image: ${formatErr(uploadError)}`)
        throw new Error('Erreur upload image')
      }
      imagepath = data.path
    }

    // 2) Insertion de la récompense
    const { data, error, aborted } = await withAbortSafe(
      supabase
        .from('recompenses')
        .insert({
          label,
          imagepath,
          selected: false,
          user_id: userId,
        })
        .select()
        .single()
    )
    if (aborted) return
    if (error) {
      console.error(`❌ Erreur ajout récompense: ${formatErr(error)}`)
      throw new Error('Erreur ajout récompense')
    }

    setRecompenses((prev) => [...prev, data])
    return data
  }

  const deleteRecompense = async (id) => {
    const rec = recompenses.find((r) => r.id === id)

    // 1) Supprimer l’image associée si présente
    if (rec?.imagepath) {
      const { error: storageError, aborted: storageAborted } = await withAbortSafe(
        supabase.storage.from('images').remove([rec.imagepath])
      )
      if (!storageAborted && storageError) {
        console.warn(`⚠️ Erreur suppression image: ${formatErr(storageError)}`)
      }
    }

    // 2) Supprimer la ligne
    const { error, aborted } = await withAbortSafe(
      supabase.from('recompenses').delete().eq('id', id).eq('user_id', userId)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur suppression récompense: ${formatErr(error)}`)
      throw new Error('Erreur suppression récompense')
    }

    setRecompenses((prev) => prev.filter((r) => r.id !== id))
  }

  const selectRecompense = async (id) => {
    const updates = recompenses.map((r) =>
      r.id === id
        ? { 
            id: r.id, 
            selected: true, 
            user_id: userId,
            label: r.label, // Inclure le label obligatoire
            points_requis: r.points_requis,
            visible_en_demo: r.visible_en_demo
          }
        : { 
            id: r.id, 
            selected: false, 
            user_id: userId,
            label: r.label, // Inclure le label obligatoire
            points_requis: r.points_requis,
            visible_en_demo: r.visible_en_demo
          }
    )

    const { error, aborted } = await withAbortSafe(
      supabase.from('recompenses').upsert(updates, { onConflict: 'id' })
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur sélection récompense: ${formatErr(error)}`)
      throw new Error('Erreur sélection récompense')
    }

    setRecompenses((prev) => prev.map((r) => ({ ...r, selected: r.id === id })))
  }

  const deselectAll = async () => {
    const { error, aborted } = await withAbortSafe(
      supabase.from('recompenses').update({ selected: false }).eq('user_id', userId).neq('selected', false)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur désélection récompenses: ${formatErr(error)}`)
      throw new Error('Erreur désélection')
    }
    setRecompenses((prev) => prev.map((r) => ({ ...r, selected: false })))
  }

  const updateLabel = async (id, label) => {
    const { error, aborted } = await withAbortSafe(
      supabase.from('recompenses').update({ label }).eq('id', id).eq('user_id', userId)
    )
    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`❌ Erreur mise à jour label récompense: ${formatErr(error)}`)
      throw new Error('Erreur mise à jour label')
    }
    setRecompenses((prev) => prev.map((r) => (r.id === id ? { ...r, label } : r)))
  }

  return {
    recompenses,
    createRecompense,
    deleteRecompense,
    selectRecompense,
    deselectAll,
    updateLabel,
  }
}
