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
import {
  modernUploadImage,
  replaceImage,
} from '@/utils/storage/modernUploadImage'

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
    console.log('🔄 useTachesEdition: useEffect déclenché, reload =', reload)
    if (!user?.id) return
    ;(async () => {
      console.log('📡 Fetching tâches depuis Supabase...')
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
      console.log(`✅ Tâches fetchées: ${norm.length} tâches`)
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

  // ➕ Ajout avec fichier (upload moderne + insert)
  const addTacheFromFile = async (file, fields = {}, onProgress = null) => {
    if (!user?.id)
      return { data: null, error: new Error('Utilisateur manquant') }
    try {
      // 🆕 Upload moderne avec WebP, HEIC support, déduplication
      const uploadResult = await modernUploadImage(file, {
        userId: user.id,
        assetType: 'task_image',
        prefix: 'taches',
        onProgress,
      })

      if (uploadResult.error) throw uploadResult.error

      const toInsert = {
        user_id: user.id,
        label: fields.label ?? '',
        categorie: fields.categorie ?? null,
        aujourdhui: !!fields.aujourdhui,
        fait: false,
        imagepath: uploadResult.path,
        position: Number.isFinite(fields.position)
          ? fields.position
          : taches.length,
      }

      const { data, error: insErr } = await supabase
        .from('taches')
        .insert([toInsert])
        .select()
        .single()
      if (insErr) {
        console.error('❌ Erreur insertion tâche:', {
          message: insErr.message,
          code: insErr.code,
          details: insErr.details,
          hint: insErr.hint,
          toInsert,
        })
        throw insErr
      }

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

  // ✏️ Remplacement d'image avec versioning
  const updateTacheImage = async (id, file, onProgress = null) => {
    if (!user?.id)
      return { data: null, error: new Error('Utilisateur manquant') }
    try {
      const current = taches.find(x => x.id === id)
      if (!current?.imagepath) {
        throw new Error('Tâche sans image associée')
      }

      // Trouver asset_id correspondant
      const { data: asset } = await supabase
        .from('user_assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('file_path', current.imagepath)
        .single()

      if (!asset) {
        throw new Error('Asset introuvable')
      }

      // 🆕 Remplacer image avec versioning + invalidation cache
      const replaceResult = await replaceImage(asset.id, file, {
        userId: user.id,
        onProgress,
      })

      if (replaceResult.error) throw replaceResult.error

      const { data, error: updErr } = await supabase
        .from('taches')
        .update({ imagepath: replaceResult.path })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      if (updErr) throw updErr

      setTaches(prev =>
        prev.map(t =>
          t.id === id ? { ...t, imagepath: replaceResult.path } : t
        )
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
