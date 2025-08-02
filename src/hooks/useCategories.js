import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'

export default function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchCategories = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('label', { ascending: true })

    if (error) {
      console.error('Erreur chargement catégories :', error)
    } else {
      setCategories(data)
    }

    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const addCategory = async cat => {
    const { error } = await supabase.from('categories').insert([
      {
        label: cat.label,
        value: cat.value,
        user_id: user.id,
      },
    ])

    if (error) {
      console.error('Erreur ajout catégorie :', error)
    } else {
      fetchCategories()
    }
  }

  const updateCategory = async (id, newLabel) => {
    const { error } = await supabase
      .from('categories')
      .update({ label: newLabel })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erreur modification catégorie :', error)
    } else {
      fetchCategories()
    }
  }

  const deleteCategory = async id => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erreur suppression catégorie :', error)
    } else {
      fetchCategories()
    }
  }

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
  }
}
