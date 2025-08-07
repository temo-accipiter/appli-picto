import { useState, useEffect } from 'react'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'

export default function useRecompenses(reload = 0) {
  const [recompenses, setRecompenses] = useState([])
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    supabase
      .from('recompenses')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) console.error('❌ Erreur chargement récompenses:', error)
        else setRecompenses(data)
      })
  }, [reload, userId])
  /*
  const createRecompense = async ({ label, image }) => {
    let imagepath = ''

    if (image) {
      const cleanName = image.name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9_.-]/g, '')
      const fileName = `${userId}/recompenses/${Date.now()}-${cleanName}`

      const { data, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, image)

      if (uploadError) {
        console.error('❌ Erreur upload image:', uploadError)
        throw new Error('Erreur upload image')
      }

      imagepath = data.path
    }

    const { data, error } = await supabase
      .from('recompenses')
      .insert({
        label,
        imagepath,
        selected: false,
        user_id: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Erreur ajout récompense:', error)
      throw new Error('Erreur ajout récompense')
    }

    setRecompenses(prev => [...prev, data])
    return data
  }
*/
  const createRecompense = async ({ label, image }) => {
    let imagepath = ''

    if (image) {
      const cleanName = image.name
        ? image.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_.-]/g, '')
        : `${Date.now()}` // valeur de secours si name non défini

      const fileName = `${userId}/recompenses/${Date.now()}-${cleanName}`

      const { data, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, image)

      if (uploadError) {
        console.error('❌ Erreur upload image:', uploadError)
        throw new Error('Erreur upload image')
      }

      imagepath = data.path
    }

    const { data, error } = await supabase
      .from('recompenses')
      .insert({
        label,
        imagepath,
        selected: false,
        user_id: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Erreur ajout récompense:', error)
      throw new Error('Erreur ajout récompense')
    }

    setRecompenses(prev => [...prev, data])
    return data
  }

  const deleteRecompense = async id => {
    const rec = recompenses.find(r => r.id === id)

    if (rec?.imagepath) {
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([rec.imagepath])
      if (storageError) {
        console.warn('⚠️ Erreur suppression image:', storageError)
      } else {
        console.log('🗑️ Image de récompense supprimée')
      }
    }

    const { error } = await supabase
      .from('recompenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Erreur suppression récompense:', error)
      throw new Error('Erreur suppression récompense')
    }

    setRecompenses(prev => prev.filter(r => r.id !== id))
  }

  const selectRecompense = async id => {
    const updates = recompenses.map(r =>
      r.id === id
        ? { id: r.id, selected: true, user_id: userId }
        : { id: r.id, selected: false, user_id: userId }
    )

    const { error } = await supabase
      .from('recompenses')
      .upsert(updates, { onConflict: 'id' })

    if (error) {
      console.error('❌ Erreur sélection récompense:', error)
      throw new Error('Erreur sélection récompense')
    }

    setRecompenses(prev => prev.map(r => ({ ...r, selected: r.id === id })))
  }

  const deselectAll = async () => {
    const { error } = await supabase
      .from('recompenses')
      .update({ selected: false })
      .eq('user_id', userId)
      .neq('selected', false)

    if (error) {
      console.error('❌ Erreur désélection récompenses:', error)
      throw new Error('Erreur désélection')
    }

    setRecompenses(prev => prev.map(r => ({ ...r, selected: false })))
  }

  const updateLabel = async (id, label) => {
    const { error } = await supabase
      .from('recompenses')
      .update({ label })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Erreur mise à jour label récompense:', error)
      throw new Error('Erreur mise à jour label')
    }

    setRecompenses(prev => prev.map(r => (r.id === id ? { ...r, label } : r)))
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
