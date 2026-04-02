// src/hooks/useTaches.ts
import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import type { Tache } from '@/types/global'
import { supabase } from '@/utils/supabaseClient'
import { useAuth, useI18n, useToast } from '@/hooks'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'

// Log d'erreur "safe"
const formatErr = (e: unknown): string => {
  const err = e as PostgrestError | Error
  const m = String(err?.message ?? e)
  const parts = [
    m,
    'code' in err && err?.code ? `[${err.code}]` : '',
    'details' in err && err?.details ? `— ${err.details}` : '',
    'hint' in err && err?.hint ? `(hint: ${err.hint})` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

interface UseTachesReturn {
  taches: Tache[]
  setTaches: Dispatch<SetStateAction<Tache[]>>
  toggleFait: (id: string, current: boolean) => Promise<void>
  resetFait: () => Promise<void>
  updatePosition: (
    ordered: Tache[]
  ) => Promise<{ error: PostgrestError | Error | null }>
  deleteTache: (t: Tache | string) => Promise<void>
}

export default function useTaches(reload = 0): UseTachesReturn {
  const [taches, setTaches] = useState<Tache[]>([])
  const { user, authReady } = useAuth()
  const { show } = useToast()
  const { t } = useI18n()

  // 📥 Chargement initial
  useEffect(() => {
    // ✅ CORRECTIF : Attendre que l'auth soit prête ET que user existe
    if (!authReady || !user?.id)
      return // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('taches')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(`❌ Erreur fetch taches Supabase : ${formatErr(error)}`)
        } else {
          // ✅ Normalise en booléens côté front
          const norm = (data || []).map(t => ({
            ...t,
            aujourdhui: !!t.aujourdhui,
            fait: !!t.fait,
          }))
          setTaches(norm)
        }
      })
  }, [reload, user?.id, authReady])

  // ✅ Toggle "fait" (DB en bool, état local en bool)
  const toggleFait = async (id: string, current: boolean): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('taches')
      .update({ fait: !current })
      .eq('id', id)
      .eq('user_id', user!.id)

    if (error) {
      console.error(`❌ Erreur update fait : ${formatErr(error)}`)
      show(t('toasts.taskUpdateError'), 'error')
    } else {
      setTaches(prev =>
        prev.map(t => (t.id === id ? { ...t, fait: !current } : t))
      )
    }
  }

  // ♻️ Reset "fait"
  const resetFait = async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('taches')
      .update({ fait: false })
      .eq('user_id', user!.id)

    if (error) {
      console.error(`❌ Erreur reset fait : ${formatErr(error)}`)
      show(t('toasts.taskResetError'), 'error')
    } else {
      setTaches(prev => prev.map(t => ({ ...t, fait: false })))
      show(t('toasts.allTasksReset'), 'success')
    }
  }

  // ↕️ Mise à jour de l'ordre
  const updatePosition = async (
    ordered: Tache[]
  ): Promise<{ error: PostgrestError | Error | null }> => {
    try {
      // Mettre à jour l'état local immédiatement pour une UI fluide
      setTaches(ordered)

      // Envoyer les mises à jour en série pour éviter les problèmes de concurrence
      const updates = ordered.map((t, idx) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('taches')
          .update({ position: idx })
          .eq('id', t.id)
          .eq('user_id', user!.id)
          .then(({ error }) => {
            if (error) {
              console.error(
                `❌ Erreur update position tâche ${t.id} : ${formatErr(error)}`
              )
              throw error
            }
          })
      )

      await Promise.all(updates)
      return { error: null }
    } catch (error) {
      console.error(`❌ Erreur mise à jour positions : ${formatErr(error)}`)
      show(t('toasts.taskUpdateError'), 'error')
      return { error: error as PostgrestError | Error }
    }
  }

  // 🗑️ Suppression (avec image associée si présente)
  const deleteTache = async (tache: Tache | string): Promise<void> => {
    const id = typeof tache === 'string' ? tache : tache?.id
    const imagePath = typeof tache === 'object' ? tache?.imagepath : undefined

    if (!id) {
      console.error('❌ Tâche invalide :', tache)
      show(t('toasts.invalidTask'), 'error')
      return
    }

    if (imagePath) {
      const { deleted, error } = await deleteImageIfAny(imagePath)
      if (error) console.warn('⚠️ Erreur suppression image :', formatErr(error))
      else if (deleted) console.log('🗑️ Image Supabase supprimée')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('taches')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id)

    if (error) {
      console.error(`❌ Erreur suppression tâche : ${formatErr(error)}`)
      show(t('toasts.taskDeleteError'), 'error')
    } else {
      console.log('✅ Tâche supprimée avec succès')
      setTaches(prev => prev.filter(task => task.id !== id))
      show(t('toasts.taskDeleted'), 'success')
    }
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
