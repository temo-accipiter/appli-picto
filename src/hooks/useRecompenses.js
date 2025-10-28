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
import { useAuth, useI18n, useToast } from '@/hooks'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
import formatErr from '@/utils/logs/formatErr'
import {
  modernUploadImage,
  replaceImage,
} from '@/utils/storage/modernUploadImage'

export default function useRecompenses(reload = 0) {
  const { user } = useAuth()
  const { show } = useToast()
  const { t } = useI18n()
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
      show(t('toasts.rewardAdded'), 'success')
      return { data, error: null }
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur ajout récompense : ${formatErr(e)}`)
      show(t('toasts.rewardAddError'), 'error')
      return { data: null, error: e }
    }
  }

  // ➕ Création avec fichier (upload moderne → path → insert)
  const addRecompenseFromFile = async (
    file,
    fields = {},
    onProgress = null
  ) => {
    if (!user?.id) {
      show(t('toasts.userMissing'), 'error')
      return { data: null, error: new Error('Utilisateur manquant') }
    }
    try {
      setError(null)

      // 🆕 Upload moderne avec WebP, HEIC support, déduplication
      const uploadResult = await modernUploadImage(file, {
        userId: user.id,
        assetType: 'reward_image',
        prefix: 'recompenses',
        onProgress,
      })

      if (uploadResult.error) throw uploadResult.error

      return await addRecompense({
        ...fields,
        imagepath: uploadResult.path,
      })
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur ajout récompense (upload) : ${formatErr(e)}`)
      show(t('toasts.imageUploadError'), 'error')
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
      show(t('toasts.rewardModified'), 'success')
      return { data, error: null }
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur update récompense : ${formatErr(e)}`)
      show(t('toasts.rewardModifyError'), 'error')
      return { data: null, error: e }
    }
  }

  // 🖼️ Remplacement d'image avec versioning
  const updateRecompenseImage = async (id, file, onProgress = null) => {
    if (!user?.id) {
      show(t('toasts.userMissing'), 'error')
      return { data: null, error: new Error('Utilisateur manquant') }
    }
    try {
      const current = recompenses.find(r => r.id === id)
      if (!current?.imagepath) {
        throw new Error('Récompense sans image associée')
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

      return await updateRecompense(id, { imagepath: replaceResult.path })
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur remplacement image récompense : ${formatErr(e)}`)
      show(t('toasts.imageReplaceError'), 'error')
      return { data: null, error: e }
    }
  }

  // 🗑️ Suppression (ligne + image storage si présente)
  const deleteRecompense = async rec => {
    const id = typeof rec === 'string' ? rec : rec?.id
    const imagePath = rec?.imagepath
    if (!id) {
      console.error('❌ Récompense invalide :', rec)
      show(t('toasts.invalidReward'), 'error')
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
      show(t('toasts.rewardDeleted'), 'success')
      return { error: null }
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur suppression récompense : ${formatErr(e)}`)
      show(t('toasts.rewardDeleteError'), 'error')
      return { error: e }
    }
  }

  // ⭐ Sélection unique OPTIMISÉE (1 seul appel RPC au lieu de 2 requêtes)
  const selectRecompense = async id => {
    if (!user?.id) {
      show(t('toasts.userMissing'), 'error')
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
      show(t('toasts.rewardSelected'), 'success')
      return { data, error: null }
    } catch (e) {
      setError(e)
      console.error(`❌ Erreur sélection récompense : ${formatErr(e)}`)
      show(t('toasts.rewardSelectError'), 'error')
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
