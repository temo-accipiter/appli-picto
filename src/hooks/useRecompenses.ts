// src/hooks/useRecompenses.ts
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
import type { Dispatch, SetStateAction } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import type { Recompense } from '@/types/global'
import { supabase } from '@/utils/supabaseClient'
import { useAuth, useI18n, useToast } from '@/hooks'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
import formatErr from '@/utils/logs/formatErr'
import {
  modernUploadImage,
  replaceImage,
} from '@/utils/storage/modernUploadImage'

interface RecompensePayload {
  label?: string
  description?: string | null
  points_requis?: number
  icone?: string | null
  couleur?: string | null
  imagepath?: string | null
  selected?: boolean
  visible_en_demo?: boolean
}

interface OperationResult<T = Recompense> {
  data: T | null
  error: Error | PostgrestError | null
}

interface UseRecompensesReturn {
  recompenses: Recompense[]
  loading: boolean
  error: Error | PostgrestError | null

  addRecompense: (payload: RecompensePayload) => Promise<OperationResult>
  addRecompenseFromFile: (
    file: File,
    fields?: RecompensePayload,
    onProgress?: ((progress: number) => void) | null
  ) => Promise<OperationResult>
  createRecompense: (payload: RecompensePayload) => Promise<OperationResult> // Alias
  updateRecompense: (
    id: string,
    updates: Partial<RecompensePayload>
  ) => Promise<OperationResult>
  updateRecompenseImage: (
    id: string,
    file: File,
    onProgress?: ((progress: number) => void) | null
  ) => Promise<OperationResult>
  updateLabel: (id: string, label: string) => Promise<OperationResult>
  deleteRecompense: (
    rec: Recompense | string
  ) => Promise<{ error: Error | PostgrestError | null }>
  selectRecompense: (id: string) => Promise<OperationResult>
  deselectAll: () => Promise<{ error: Error | PostgrestError | null }>

  setRecompenses: Dispatch<SetStateAction<Recompense[]>>
}

export default function useRecompenses(reload = 0): UseRecompensesReturn {
  const { user, authReady } = useAuth()
  const { show } = useToast()
  const { t } = useI18n()
  const [recompenses, setRecompenses] = useState<Recompense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | PostgrestError | null>(null)

  // 📥 Lecture : uniquement les récompenses de l'utilisateur connecté
  useEffect(() => {
    let cancelled = false
    // ✅ CORRECTIF : Attendre que l'auth soit prête ET que user existe
    if (!authReady || !user?.id) return
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
          setError(e as Error | PostgrestError)
          console.error(`❌ Erreur fetch récompenses : ${formatErr(e)}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, authReady, reload])

  // ➕ Création (user_id fixé par trigger; on ne l'envoie pas)
  const addRecompense = async (
    payload: RecompensePayload
  ): Promise<OperationResult> => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert([toInsert] as any)
        .select()
        .single()

      if (error) throw error
      setRecompenses(prev => [...prev, data])
      show(t('toasts.rewardAdded'), 'success')
      return { data, error: null }
    } catch (e) {
      const err = e as Error | PostgrestError
      setError(err)
      console.error(`❌ Erreur ajout récompense : ${formatErr(e)}`)
      show(t('toasts.rewardAddError'), 'error')
      return { data: null, error: err }
    }
  }

  // ➕ Création avec fichier (upload moderne → path → insert)
  const addRecompenseFromFile = async (
    file: File,
    fields: RecompensePayload = {},
    onProgress: ((progress: number) => void) | null = null
  ): Promise<OperationResult> => {
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
        onProgress: onProgress ? info => onProgress(info.progress) : null,
      })

      if (uploadResult.error) throw uploadResult.error

      return await addRecompense({
        ...fields,
        imagepath: uploadResult.path,
      })
    } catch (e) {
      const err = e as Error | PostgrestError
      setError(err)
      console.error(`❌ Erreur ajout récompense (upload) : ${formatErr(e)}`)
      show(t('toasts.imageUploadError'), 'error')
      return { data: null, error: err }
    }
  }

  // ✏️ Mise à jour (champ à champ)
  const updateRecompense = async (
    id: string,
    updates: Partial<RecompensePayload>
  ): Promise<OperationResult> => {
    try {
      setError(null)
      const allowed: Record<string, unknown> = {}
      if (updates.label !== undefined) allowed.label = updates.label
      if (updates.description !== undefined)
        allowed.description = updates.description
      if (updates.points_requis !== undefined)
        allowed.points_requis = updates.points_requis
      if (updates.icone !== undefined) allowed.icone = updates.icone
      if (updates.couleur !== undefined) allowed.couleur = updates.couleur
      if (updates.imagepath !== undefined) allowed.imagepath = updates.imagepath
      if (updates.selected !== undefined) allowed.selected = updates.selected
      if (updates.visible_en_demo !== undefined)
        allowed.visible_en_demo = updates.visible_en_demo

      const { data, error } = await supabase
        .from('recompenses')
        .update(allowed)
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single()

      if (error) throw error
      setRecompenses(prev =>
        prev.map(r => (r.id === id ? { ...r, ...data } : r))
      )
      // Pas de toast générique - on laisse les fonctions spécifiques gérer leurs toasts
      return { data, error: null }
    } catch (e) {
      const err = e as Error | PostgrestError
      setError(err)
      console.error(`❌ Erreur update récompense : ${formatErr(e)}`)
      show(t('toasts.rewardModifyError'), 'error')
      return { data: null, error: err }
    }
  }

  // 🖼️ Remplacement d'image avec versioning
  const updateRecompenseImage = async (
    id: string,
    file: File,
    onProgress: ((progress: number) => void) | null = null
  ): Promise<OperationResult> => {
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
        onProgress: onProgress ? info => onProgress(info.progress) : null,
      })

      if (replaceResult.error) throw replaceResult.error

      return await updateRecompense(id, { imagepath: replaceResult.path })
    } catch (e) {
      const err = e as Error | PostgrestError
      setError(err)
      console.error(`❌ Erreur remplacement image récompense : ${formatErr(e)}`)
      show(t('toasts.imageReplaceError'), 'error')
      return { data: null, error: err }
    }
  }

  // 🗑️ Suppression (ligne + image storage si présente)
  const deleteRecompense = async (
    rec: Recompense | string
  ): Promise<{ error: Error | PostgrestError | null }> => {
    const id = typeof rec === 'string' ? rec : rec?.id
    const imagePath = typeof rec === 'object' ? rec?.imagepath : undefined
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
        .eq('user_id', user!.id)

      if (error) throw error

      setRecompenses(prev => prev.filter(r => r.id !== id))
      show(t('toasts.rewardDeleted'), 'success')
      return { error: null }
    } catch (e) {
      const err = e as Error | PostgrestError
      setError(err)
      console.error(`❌ Erreur suppression récompense : ${formatErr(e)}`)
      show(t('toasts.rewardDeleteError'), 'error')
      return { error: err }
    }
  }

  // ⭐ Sélection unique OPTIMISÉE (1 seul appel RPC au lieu de 2 requêtes)
  const selectRecompense = async (id: string): Promise<OperationResult> => {
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
      // Pas de toast pour la sélection (action visuelle suffisante)
      return { data, error: null }
    } catch (e) {
      const err = e as Error | PostgrestError
      setError(err)
      console.error(`❌ Erreur sélection récompense : ${formatErr(e)}`)
      show(t('toasts.rewardSelectError'), 'error')
      return { data: null, error: err }
    }
  }

  // ⭐ Désélectionner toutes les récompenses
  const deselectAll = async (): Promise<{
    error: Error | PostgrestError | null
  }> => {
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
      const err = e as Error | PostgrestError
      setError(err)
      console.error(`❌ Erreur désélection récompenses : ${formatErr(e)}`)
      return { error: err }
    }
  }

  // ✏️ Renommer (sans toast - déjà géré dans updateRecompense)
  const updateLabel = async (
    id: string,
    label: string
  ): Promise<OperationResult> => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('recompenses')
        .update({ label })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single()

      if (error) throw error

      setRecompenses(prev => prev.map(r => (r.id === id ? { ...r, label } : r)))
      show(t('toasts.rewardRenamed'), 'success')
      return { data, error: null }
    } catch (e) {
      const err = e as Error | PostgrestError
      setError(err)
      console.error(`❌ Erreur renommage récompense : ${formatErr(e)}`)
      show(t('toasts.rewardModifyError'), 'error')
      return { data: null, error: err }
    }
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
