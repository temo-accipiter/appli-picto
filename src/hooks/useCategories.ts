// src/hooks/useCategories.ts
// CRUD catégories personnelles (Subscriber/Admin uniquement via RLS)
// DB-first strict : le front tente → gère le refus DB proprement
// Contrat §5.2.4 + §3.2.3

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import { useAuth, useToast } from '@/hooks'
import type { Database } from '@/types/supabase'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']

interface UseCategoriesReturn {
  categories: Category[]
  loading: boolean
  error: Error | null
  /** Catégorie système "Sans catégorie" (is_system=TRUE) — visible mais jamais modifiable */
  systemCategory: Category | null
  addCategory: (name: string) => Promise<{ error: Error | null }>
  updateCategory: (id: string, name: string) => Promise<{ error: Error | null }>
  deleteCategory: (id: string) => Promise<{ error: Error | null }>
  refresh: () => void
}

/**
 * Gestion des catégories personnelles
 *
 * Nouveau schéma (S3) :
 * - Table : categories (account_id, name, is_system)
 * - "Sans catégorie" (is_system=TRUE) : visible, JAMAIS modifiable/supprimable
 * - DB refuse toute modification sur is_system=TRUE (RLS + contrainte)
 * - DB refuse si execution-only (BLOCKER 4)
 *
 * ⚠️ Pas de quota côté front : DB refuse si quota dépassé (trigger)
 */
export default function useCategories(reload: number = 0): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user, authReady } = useAuth()
  const { show } = useToast()

  useEffect(() => {
    if (!authReady) return
    if (!user?.id) {
      setCategories([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchCategories = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('*')
          .eq('account_id', user.id)
          .order('is_system', { ascending: false }) // "Sans catégorie" en premier
          .order('name', { ascending: true })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        setCategories(Array.isArray(data) ? (data as Category[]) : [])
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useCategories] Erreur chargement catégories:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchCategories()

    return () => {
      controller.abort()
    }
  }, [authReady, user?.id, reload, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  /**
   * Créer une catégorie
   * - DB refuse si quota dépassé, si execution-only, si is_system (RLS + contrainte)
   * - Nom unique par compte (contrainte UNIQUE)
   */
  const addCategory = useCallback(
    async (name: string): Promise<{ error: Error | null }> => {
      if (!user?.id) return { error: new Error('Non connecté') }

      const insert: CategoryInsert = {
        account_id: user.id,
        name: name.trim(),
        is_system: false,
      }

      const { data, error: insertError } = await supabase
        .from('categories')
        .insert([insert])
        .select()
        .single()

      if (insertError) {
        console.error('[useCategories] Erreur création catégorie:', insertError)
        show('Impossible de créer la catégorie', 'error')
        return { error: insertError as Error }
      }

      if (!data) {
        const err = new Error('Création refusée')
        show('Impossible de créer la catégorie', 'error')
        return { error: err }
      }

      show('Catégorie créée', 'success')
      refresh()
      return { error: null }
    },
    [user?.id, refresh, show]
  )

  /**
   * Modifier le nom d'une catégorie
   * - DB refuse si is_system=TRUE (RLS : USING is_system = FALSE)
   * - DB refuse si execution-only (BLOCKER 4)
   */
  const updateCategory = useCallback(
    async (id: string, name: string): Promise<{ error: Error | null }> => {
      if (!user?.id) return { error: new Error('Non connecté') }

      const { error: updateError } = await supabase
        .from('categories')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('account_id', user.id)

      if (updateError) {
        console.error(
          '[useCategories] Erreur modification catégorie:',
          updateError
        )
        show('Impossible de modifier la catégorie', 'error')
        return { error: updateError as Error }
      }

      show('Catégorie modifiée', 'success')
      refresh()
      return { error: null }
    },
    [user?.id, refresh, show]
  )

  /**
   * Supprimer une catégorie
   * - DB refuse si is_system=TRUE (RLS)
   * - DB refuse si execution-only (BLOCKER 4)
   * - Trigger DB réassigne automatiquement les cartes vers "Sans catégorie"
   * - Le front ne fait PAS la réassignation
   */
  const deleteCategory = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      if (!user?.id) return { error: new Error('Non connecté') }

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('account_id', user.id)

      if (deleteError) {
        console.error(
          '[useCategories] Erreur suppression catégorie:',
          deleteError
        )
        show('Impossible de supprimer la catégorie', 'error')
        return { error: deleteError as Error }
      }

      show('Catégorie supprimée', 'success')
      refresh()
      return { error: null }
    },
    [user?.id, refresh, show]
  )

  const systemCategory = categories.find(c => c.is_system) ?? null

  return {
    categories,
    loading,
    error,
    systemCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    refresh,
  }
}
