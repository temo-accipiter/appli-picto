// src/hooks/useCategories.ts
// Gestion des catégories compatible avec schéma/policies

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth, useI18n, useToast } from '@/hooks'

interface Category {
  id: string
  label: string
  value: string
  user_id?: string | null
  created_at?: string
  updated_at?: string
}

interface CategoryInput {
  label: string
  value: string
}

interface UseCategoriesReturn {
  categories: Category[]
  loading: boolean
  error: Error | null
  addCategory: (cat: CategoryInput) => Promise<{ error: Error | null }>
  updateCategory: (
    id: string,
    newLabel: string
  ) => Promise<{ error: Error | null }>
  deleteCategory: (value: string) => Promise<{ error: Error | null }>
  refresh: () => Promise<void>
}

const formatErr = (e: unknown): string => {
  const error = e as {
    message?: string
    code?: string
    details?: string
    hint?: string
  }
  const m = String(error?.message ?? e)
  const parts = [
    m,
    error?.code ? `[${error.code}]` : '',
    error?.details ? `— ${error.details}` : '',
    error?.hint ? `(hint: ${error.hint})` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

export default function useCategories(reload: number = 0): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()
  const { show } = useToast()

  const fetchCategoriesInternal = async () => {
    if (!user?.id) {
      setCategories([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('label', { ascending: true })

      if (err) throw err

      setCategories(Array.isArray(data) ? (data as Category[]) : [])
    } catch (e) {
      console.error(`Erreur chargement catégories : ${formatErr(e)}`)
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategoriesInternal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, user?.id])

  const addCategory = async (
    cat: CategoryInput
  ): Promise<{ error: Error | null }> => {
    try {
      const { data, error: err } = await supabase
        .from('categories')
        .insert([{ label: cat.label, value: cat.value }])
        .select()

      if (err) throw err
      if (!data || data.length === 0) throw new Error('Insertion bloquée')

      await fetchCategoriesInternal()
      show(t('toasts.categoryAdded'), 'success')
      return { error: null }
    } catch (e) {
      console.error(`Erreur ajout catégorie : ${formatErr(e)}`)
      show(t('toasts.categoryAddError'), 'error')
      return { error: e as Error }
    }
  }

  const updateCategory = async (
    id: string,
    newLabel: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { error: err } = await supabase
        .from('categories')
        .update({ label: newLabel })
        .eq('id', id)
        .or(`user_id.eq.${user?.id},user_id.is.null`)
      if (err) throw err
      await fetchCategoriesInternal()
      show(t('toasts.categoryModified'), 'success')
      return { error: null }
    } catch (e) {
      console.error(`Erreur modification catégorie : ${formatErr(e)}`)
      show(t('toasts.categoryModifyError'), 'error')
      return { error: e as Error }
    }
  }

  const deleteCategory = async (
    value: string
  ): Promise<{ error: Error | null }> => {
    if (!user?.id) return { error: new Error('User not authenticated') }
    try {
      const { error: err } = await supabase
        .from('categories')
        .delete()
        .eq('value', value)
        .eq('user_id', user.id)

      if (err) throw err

      await fetchCategoriesInternal()
      show(t('toasts.categoryDeleted'), 'success')
      return { error: null }
    } catch (e) {
      console.error(`Erreur suppression catégorie : ${formatErr(e)}`)
      show(t('toasts.categoryDeleteError'), 'error')
      return { error: e as Error }
    }
  }

  const refresh = useCallback(async () => {
    return fetchCategoriesInternal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refresh,
  }
}
