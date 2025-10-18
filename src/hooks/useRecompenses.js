// src/hooks/useRecompenses.js
/**
 * Récompenses (compatibles avec le schéma Supabase fourni) :
 * - 🔎 Chargement par utilisateur (ordre: created_at asc via index)
 * - ➕ Création (user_id géré par trigger; on n'envoie pas user_id explicitement)
 * - ✏️ Update (label, description, points_requis, icone, couleur, selected, imagepath)
 * - 🖼️ Upload/remplacement d'image (bucket privé "images")
 * - 🗑️ Suppression (avec purge image Storage)
 * - ⭐ Sélection unique (index unique "recompenses_one_selected_per_user")
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth, useToast } from '@/hooks'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
import formatErr from '@/utils/logs/formatErr'
import { uploadImage } from '@/utils/storage/uploadImage'
import replaceImageIfAny from '@/utils/storage/replaceImageIfAny'

export default function useRecompenses(reload = 0) {
  const { user } = useAuth()
  const { show } = useToast()
  const [recompenses, setRecompenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 📥 Lecture : uniquement les récompenses de l'utilisateur connecté
  useEffect(() => {
    let cancelled = false
    if (!user?.id) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        // Ordre par created_at (index user_id,created_at existant)
        let { data, error } = await supabase
          .from('recompenses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        // (sécurité) si jamais created_at n'existe pas (autre env), refaire sans order
        if (error && String(error.code) === '42703') {
          const retry = await supabase
            .from('recompenses')
            .select('*')
            .eq('user_id', user.id)
          data = retry.data
          error = retry.error
        }

        if (error) throw error
        if (cancelled) return

        setRecompenses(data || [])
      } catch (e) {
        if (!cancelled) {
          setError(e)
          console.error(`❌ Erreur fetch récompenses : ${formatErr(e)}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, reload])

  // ➕ Création (user_id fixé par trigger; on ne l'envoie pas)
  const addRecompense = async payload => {
    try {
      setError(null)

      const toInsert = {
        label: payload.label ?? '',
        description: payload.description ?? null,
        points_requis: Number.isFinite(payload.points_requis)
          ? payload.points_requis
          : 0,
        icone: payload.icone ?? null,
        couleur: payload.couleur ?? null,
        imagepath: payload.imagepath ?? null,
        selected: !!payload.selected,
        // visible_en_demo est faux par défaut (réservé aux démos globales)
      }

      const { data, error } = await supabase
        .from('recompenses')
        .insert([toInsert])
        .select()
        .single()

      if (error) throw error
      setRecompenses(prev => [...prev, data])
      show('Récompense ajoutée', 'success')
      return { data, error: null }
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur ajout récompense : ${formatErr(e)}`)
      show("Erreur lors de l'ajout de la récompense", 'error')
      return { data: null, error: e }
    }
  }

  // ➕ Création avec fichier (upload → path → insert)
  const addRecompenseFromFile = async (file, fields = {}) => {
    if (!user?.id) {
      show('Erreur : utilisateur manquant', 'error')
      return { data: null, error: new Error('Utilisateur manquant') }
    }
    try {
      setError(null)
      const { path, error: upErr } = await uploadImage(file, {
        userId: user.id,
        bucket: 'images', // ✅ bucket privé réel
        prefix: 'recompenses', // sous-dossier
        sign: false, // on stocke le path; les composants afficheront via URL signée
      })
      if (upErr) throw upErr

      return await addRecompense({
        ...fields,
        imagepath: path,
      })
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur ajout récompense (upload) : ${formatErr(e)}`)
      show("Erreur lors de l'upload de l'image", 'error')
      return { data: null, error: e }
    }
  }

  // ✏️ Mise à jour (champ à champ)
  const updateRecompense = async (id, updates) => {
    try {
      setError(null)
      const allowed = {
        label: updates.label,
        description: updates.description,
        points_requis: updates.points_requis,
        icone: updates.icone,
        couleur: updates.couleur,
        imagepath: updates.imagepath,
        selected:
          typeof updates.selected === 'boolean' ? updates.selected : undefined,
        visible_en_demo: updates.visible_en_demo,
      }
      // retire les undefined (évite UPDATE inutile)
      Object.keys(allowed).forEach(
        k => allowed[k] === undefined && delete allowed[k]
      )

      const { data, error } = await supabase
        .from('recompenses')
        .update(allowed)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      setRecompenses(prev =>
        prev.map(r => (r.id === id ? { ...r, ...data } : r))
      )
      show('Récompense modifiée', 'success')
      return { data, error: null }
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur update récompense : ${formatErr(e)}`)
      show('Erreur lors de la modification', 'error')
      return { data: null, error: e }
    }
  }

  // 🖼️ Remplacement d'image (delete best-effort + upload)
  const updateRecompenseImage = async (id, file) => {
    if (!user?.id) {
      show('Erreur : utilisateur manquant', 'error')
      return { data: null, error: new Error('Utilisateur manquant') }
    }
    try {
      const current = recompenses.find(r => r.id === id)
      const oldPath = current?.imagepath || null

      const { path, error } = await replaceImageIfAny(oldPath, file, {
        userId: user.id,
        prefix: 'recompenses',
      })
      if (error) throw error

      return await updateRecompense(id, { imagepath: path })
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur remplacement image récompense : ${formatErr(e)}`)
      show("Erreur lors du remplacement de l'image", 'error')
      return { data: null, error: e }
    }
  }

  // 🗑️ Suppression (ligne + image storage si présente)
  const deleteRecompense = async rec => {
    const id = typeof rec === 'string' ? rec : rec?.id
    const imagePath = rec?.imagepath
    if (!id) {
      console.error('❌ Récompense invalide :', rec)
      show('Erreur : récompense invalide', 'error')
      return { error: new Error('Récompense invalide') }
    }

    try {
      setError(null)

      if (imagePath) {
        const { error } = await deleteImageIfAny(imagePath)
        if (error)
          console.warn('⚠️ Erreur suppression image :', formatErr(error))
      }

      const { error } = await supabase
        .from('recompenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      setRecompenses(prev => prev.filter(r => r.id !== id))
      show('Récompense supprimée', 'success')
      return { error: null }
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur suppression récompense : ${formatErr(e)}`)
      show('Impossible de supprimer la récompense', 'error')
      return { error: e }
    }
  }

  // ⭐ Sélection unique OPTIMISÉE (1 seul appel RPC au lieu de 2 requêtes)
  const selectRecompense = async id => {
    if (!user?.id) {
      show('Erreur : utilisateur manquant', 'error')
      return { data: null, error: new Error('Utilisateur manquant') }
    }
    try {
      setError(null)

      // ✅ OPTIMISATION : Utiliser la fonction RPC atomique
      // - 1 seul round-trip réseau (au lieu de 2)
      // - Atomicité garantie (transaction implicite)
      // - Pas de race condition
      const { data, error } = await supabase
        .rpc('select_recompense_atomic', {
          p_reward_id: id,
        })
        .maybeSingle()

      if (error) throw error

      // Mise à jour de l'état local
      setRecompenses(prev =>
        prev.map(r =>
          r.id === id ? { ...r, selected: true } : { ...r, selected: false }
        )
      )
      show('Récompense sélectionnée', 'success')
      return { data, error: null }
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur sélection récompense : ${formatErr(e)}`)
      show('Erreur lors de la sélection', 'error')
      return { data: null, error: e }
    }
  }

  // ⭐ Désélectionner toutes les récompenses
  const deselectAll = async () => {
    if (!user?.id) return { error: new Error('Utilisateur manquant') }
    try {
      setError(null)
      const { error } = await supabase
        .from('recompenses')
        .update({ selected: false })
        .eq('user_id', user.id)

      if (error) throw error
      setRecompenses(prev => prev.map(r => ({ ...r, selected: false })))
      return { error: null }
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur désélection récompenses : ${formatErr(e)}`)
      return { error: e }
    }
  }

  // ✏️ Renommer (alias pour updateRecompense avec label uniquement)
  const updateLabel = async (id, label) => {
    return await updateRecompense(id, { label })
  }

  return {
    recompenses,
    loading,
    error,

    addRecompense,
    addRecompenseFromFile,
    createRecompense: addRecompense, // Alias pour compatibilité
    updateRecompense,
    updateRecompenseImage,
    updateLabel,
    deleteRecompense,
    selectRecompense,
    deselectAll,

    setRecompenses,
  }
}
