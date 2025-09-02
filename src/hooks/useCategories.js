import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'
import { withAbortSafe, isAbortLike } from '@/hooks'

// Log d'erreur "safe" (évite les soucis d'inspection sous Safari)
const formatErr = (e) => {
  const m = String(e?.message ?? e)
  const parts = [
    m,
    e?.code ? `[${e.code}]` : '',
    e?.details ? `— ${e.details}` : '',
    e?.hint ? `(hint: ${e.hint})` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

export default function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchCategories = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    const { data, error, aborted } = await withAbortSafe(
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('label', { ascending: true })
    )

    if (aborted || (error && isAbortLike(error))) {
      setLoading(false)
      return
    }

    if (error) {
      console.error(`Erreur chargement catégories : ${formatErr(error)}`)
      setLoading(false)
      return
    }

    setCategories(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const addCategory = async (cat) => {
    const { error, aborted } = await withAbortSafe(
      supabase.from('categories').insert([
        {
          label: cat.label,
          value: cat.value,
          user_id: user.id,
        },
      ])
    )

    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`Erreur ajout catégorie : ${formatErr(error)}`)
      return
    }
    fetchCategories()
  }

  const updateCategory = async (id, newLabel) => {
    const { error, aborted } = await withAbortSafe(
      supabase
        .from('categories')
        .update({ label: newLabel })
        .eq('id', id)
        .eq('user_id', user.id)
    )

    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`Erreur modification catégorie : ${formatErr(error)}`)
      return
    }
    fetchCategories()
  }

  const deleteCategory = async (id) => {
    const { error, aborted } = await withAbortSafe(
      supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
    )

    if (aborted || (error && isAbortLike(error))) return
    if (error) {
      console.error(`Erreur suppression catégorie : ${formatErr(error)}`)
      return
    }
    fetchCategories()
  }

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
  }
}
