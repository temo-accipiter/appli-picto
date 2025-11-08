// src/hooks/useTachesEdition.ts
/**
 * Édition des tâches :
 * - Liste / toggle "aujourdhui" / update label & catégorie
 * - Suppression (avec purge image)
 * - ✅ Upload/Remplacement d'image factorisé (helpers addFromFile / updateImage)
 */
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth, useToast, useI18n } from '@/hooks'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
import {
  modernUploadImage,
  replaceImage,
} from '@/utils/storage/modernUploadImage'

interface Tache {
  id: string
  user_id: string
  label: string
  fait: boolean
  aujourdhui: boolean
  imagepath: string | null
  categorie: string | null
  position: number
  category_id?: string | null
  created_at?: string
  updated_at?: string
}

interface TacheFields {
  label?: string
  categorie?: string | null
  aujourdhui?: boolean
  position?: number
}

interface SupabaseError {
  message?: string
  code?: string
  details?: string
  hint?: string
}

interface OperationResult<T = unknown> {
  data: T | null
  error: Error | SupabaseError | null
}

const formatErr = (e: unknown): string => {
  const error = e as SupabaseError & { message?: string }
  const m = String(error?.message ?? e)
  const parts = [
    m,
    error?.code ? `[${error.code}]` : '',
    error?.details ? `— ${error.details}` : '',
    error?.hint ? `(hint: ${error.hint})` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

export default function useTachesEdition(reload: number = 0) {
  const [taches, setTaches] = useState<Tache[]>([])
  const { user } = useAuth()
  const { show } = useToast()
  const { t } = useI18n()

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
      })) as Tache[]
      setTaches(norm)
    })()
  }, [reload, user?.id])

  const toggleAujourdhui = async (
    id: string,
    current: boolean
  ): Promise<OperationResult<Tache>> => {
    try {
      const { data, error } = await supabase
        .from('taches')
        .update({ aujourdhui: !current, fait: false })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single()

      if (error) throw error

      setTaches(prev =>
        prev.map(t =>
          t.id === id ? { ...t, aujourdhui: !current, fait: false } : t
        )
      )
      // Pas de toast pour le toggle checkbox (trop verbeux)
      return { data: data as Tache, error: null }
    } catch (error) {
      console.error(`❌ Erreur toggle aujourdhui : ${formatErr(error)}`)
      show(t('toasts.taskUpdateError'), 'error')
      return { data: null, error: error as Error }
    }
  }

  const updateLabel = async (
    id: string,
    label: string
  ): Promise<OperationResult<Tache>> => {
    try {
      const { data, error } = await supabase
        .from('taches')
        .update({ label })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single()

      if (error) throw error

      setTaches(prev => prev.map(t => (t.id === id ? { ...t, label } : t)))
      show(t('toasts.taskRenamed'), 'success')
      return { data: data as Tache, error: null }
    } catch (error) {
      console.error(`❌ Erreur update label : ${formatErr(error)}`)
      show(t('toasts.taskUpdateError'), 'error')
      return { data: null, error: error as Error }
    }
  }

  const updateCategorie = async (
    id: string,
    categorie: string | null
  ): Promise<OperationResult<Tache>> => {
    try {
      const { data, error } = await supabase
        .from('taches')
        .update({ categorie })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single()

      if (error) throw error

      setTaches(prev => prev.map(t => (t.id === id ? { ...t, categorie } : t)))
      show(t('toasts.taskCategoryChanged'), 'success')
      return { data: data as Tache, error: null }
    } catch (error) {
      console.error(`❌ Erreur update catégorie : ${formatErr(error)}`)
      show(t('toasts.taskUpdateError'), 'error')
      return { data: null, error: error as Error }
    }
  }

  // ➕ Ajout avec fichier (upload moderne + insert)
  const addTacheFromFile = async (
    file: File,
    fields: TacheFields = {},
    onProgress: ((progress: number) => void) | null = null
  ): Promise<OperationResult<Tache>> => {
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
          ? fields.position!
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
        { ...data, aujourdhui: !!data.aujourdhui, fait: !!data.fait } as Tache,
      ])
      return { data: data as Tache, error: null }
    } catch (e) {
      console.error(`❌ Erreur ajout tâche (upload) : ${formatErr(e)}`)
      return { data: null, error: e as Error }
    }
  }

  // ✏️ Remplacement d'image avec versioning
  const updateTacheImage = async (
    id: string,
    file: File,
    onProgress: ((progress: number) => void) | null = null
  ): Promise<OperationResult<Tache>> => {
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
      return { data: data as Tache, error: null }
    } catch (e) {
      console.error(`❌ Erreur remplacement image tâche : ${formatErr(e)}`)
      return { data: null, error: e as Error }
    }
  }

  const deleteTache = async (
    tache: string | Tache | { id?: string; imagepath?: string | null }
  ): Promise<OperationResult<null>> => {
    const id = typeof tache === 'string' ? tache : tache?.id
    const imagePath =
      typeof tache === 'object' && tache !== null ? tache.imagepath : undefined

    if (!id) {
      console.error('❌ Tâche invalide :', tache)
      show(t('toasts.invalidTask'), 'error')
      return { data: null, error: new Error('Tâche invalide') }
    }

    try {
      if (imagePath) {
        const { error } = await deleteImageIfAny(imagePath)
        if (error)
          console.warn('⚠️ Erreur suppression image :', formatErr(error))
      }

      const { error } = await supabase
        .from('taches')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id)

      if (error) throw error

      setTaches(prev => prev.filter(task => task.id !== id))
      show(t('toasts.taskDeleted'), 'success')
      return { data: null, error: null }
    } catch (error) {
      console.error(`❌ Erreur suppression tâche : ${formatErr(error)}`)
      show(t('toasts.taskDeleteError'), 'error')
      return { data: null, error: error as Error }
    }
  }

  const resetEdition = async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase
        .from('taches')
        .update({ aujourdhui: false })
        .eq('user_id', user!.id)

      if (error) throw error

      setTaches(prev => prev.map(t => ({ ...t, aujourdhui: false })))
      show(t('toasts.allTasksReset'), 'success')
      return { error: null }
    } catch (error) {
      console.error(`❌ Erreur reset édition : ${formatErr(error)}`)
      show(t('toasts.taskResetError'), 'error')
      return { error: error as Error }
    }
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
