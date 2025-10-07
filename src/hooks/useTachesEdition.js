// src/hooks/useTachesEdition.js
/**
 * Édition des tâches :
 * - Liste / toggle "aujourdhui" / update label & catégorie
 * - Suppression (avec purge image)
 * - ✅ Upload/Remplacement d'image factorisé (helpers addFromFile / updateImage)
 */
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/hooks'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
import { uploadImage } from '@/utils/storage/uploadImage'
import replaceImageIfAny from '@/utils/storage/replaceImageIfAny'

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

export default function useTachesEdition(reload = 0) {
  const [taches, setTaches] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      const { data, error } = await supabase
        .from('taches')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true })

      if (error) {
        console.error(`❌ Erreur fetch Supabase : ${formatErr(error)}`)
        return
      }
      const norm = (data || []).map(t => ({
        ...t,
        aujourdhui: !!t.aujourdhui,
        fait: !!t.fait,
      }))
      setTaches(norm)
    })()
  }, [reload, user?.id])

  const toggleAujourdhui = async (id, current) => {
    const { error } = await supabase
      .from('taches')
      .update({ aujourdhui: !current, fait: false })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      console.error(`❌ Erreur toggle aujourdhui : ${formatErr(error)}`)
      return
    }
    setTaches(prev =>
      prev.map(t =>
        t.id === id ? { ...t, aujourdhui: !current, fait: false } : t
      )
    )
  }

  const updateLabel = async (id, label) => {
    const { error } = await supabase
      .from('taches')
      .update({ label })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error)
      return console.error(`❌ Erreur update label : ${formatErr(error)}`)
    setTaches(prev => prev.map(t => (t.id === id ? { ...t, label } : t)))
  }

  const updateCategorie = async (id, categorie) => {
    const { error } = await supabase
      .from('taches')
      .update({ categorie })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error)
      return console.error(`❌ Erreur update catégorie : ${formatErr(error)}`)
    setTaches(prev => prev.map(t => (t.id === id ? { ...t, categorie } : t)))
  }

  // ➕ Ajout avec fichier (upload + insert)
  const addTacheFromFile = async (file, fields = {}) => {
    if (!user?.id)
      return { data: null, error: new Error('Utilisateur manquant') }
    try {
      const { path, error } = await uploadImage(file, {
        userId: user.id,
        prefix: 'taches',
      })
      if (error) throw error

      const toInsert = {
        user_id: user.id,
        label: fields.label ?? '',
        categorie: fields.categorie ?? null,
        aujourdhui: !!fields.aujourdhui,
        fait: false,
        imagepath: path,
        position: Number.isFinite(fields.position)
          ? fields.position
          : taches.length,
      }

      const { data, error: insErr } = await supabase
        .from('taches')
        .insert([toInsert])
        .select()
        .single()
      if (insErr) throw insErr

      setTaches(prev => [
        ...prev,
        { ...data, aujourdhui: !!data.aujourdhui, fait: !!data.fait },
      ])
      return { data, error: null }
    } catch (e) {
      console.error(`❌ Erreur ajout tâche (upload) : ${formatErr(e)}`)
      return { data: null, error: e }
    }
  }

  // ✏️ Remplacement d'image
  const updateTacheImage = async (id, file) => {
    if (!user?.id)
      return { data: null, error: new Error('Utilisateur manquant') }
    try {
      const current = taches.find(x => x.id === id)
      const oldPath = current?.imagepath || null
      const { path, error } = await replaceImageIfAny(oldPath, file, {
        userId: user.id,
        prefix: 'taches',
      })
      if (error) throw error

      const { data, error: updErr } = await supabase
        .from('taches')
        .update({ imagepath: path })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      if (updErr) throw updErr

      setTaches(prev =>
        prev.map(t => (t.id === id ? { ...t, imagepath: path } : t))
      )
      return { data, error: null }
    } catch (e) {
      console.error(`❌ Erreur remplacement image tâche : ${formatErr(e)}`)
      return { data: null, error: e }
    }
  }

  const deleteTache = async t => {
    const id = typeof t === 'string' ? t : t?.id
    const imagePath = t?.imagepath
    if (!id) {
      console.error('❌ Tâche invalide :', t)
      return
    }
    if (imagePath) {
      const { error } = await deleteImageIfAny(imagePath)
      if (error) console.warn('⚠️ Erreur suppression image :', error)
    }
    const { error } = await supabase
      .from('taches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error)
      return console.error(`❌ Erreur suppression tâche : ${formatErr(error)}`)
    setTaches(prev => prev.filter(task => task.id !== id))
  }

  const resetEdition = async () => {
    const { error } = await supabase
      .from('taches')
      .update({ aujourdhui: false })
      .eq('user_id', user.id)
    if (error)
      return console.error(`❌ Erreur reset édition : ${formatErr(error)}`)
    setTaches(prev => prev.map(t => ({ ...t, aujourdhui: false })))
  }

  return {
    taches,
    toggleAujourdhui,
    updateLabel,
    updateCategorie,
    addTacheFromFile, // ✅ nouveau
    updateTacheImage, // ✅ nouveau
    deleteTache,
    resetEdition,
  }
}
