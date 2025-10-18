// src/hooks/useCategories.js
// Gestion des catégories compatible avec ton schéma/policies :
// - SELECT : catégories de l'utilisateur + globales (user_id IS NULL)
// - INSERT : ne renseigne pas user_id (trigger le fait via auth.uid())
// - DELETE : par "value" (ton UI passe bien "value", pas "id")
// - Logs d'erreur clairs + rechargement après mutation

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth, useToast } from '@/hooks'

// Log d'erreur "safe"
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

export default function useCategories(reload = 0) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const { show } = useToast()

  // 📥 Fonction interne de fetch (sans useCallback pour simplifier les tests)
  const fetchCategoriesInternal = async () => {
    if (!user?.id) {
      setCategories([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // ✅ Récupérer à la fois les catégories de l'utilisateur ET les globales
      // Supabase JS: .or() s'applique au dernier filtre
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('label', { ascending: true })

      if (error) throw error

      setCategories(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(`Erreur chargement catégories : ${formatErr(e)}`)
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  // 📥 Chargement initial (comme useTaches)
  useEffect(() => {
    fetchCategoriesInternal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, user?.id])

  const addCategory = async cat => {
    // cat = { value, label } — user_id géré par trigger
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            label: cat.label,
            value: cat.value,
            // user_id: trigger a00_categories_set_user_id_before => auth.uid()
          },
        ])
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('Insertion bloquée par les permissions (RLS)')
      }

      await fetchCategoriesInternal()
      show('Catégorie ajoutée', 'success')
      return { error: null }
    } catch (e) {
      console.error(`Erreur ajout catégorie : ${formatErr(e)}`)
      show("Erreur lors de l'ajout de la catégorie", 'error')
      return { error: e }
    }
  }

  const updateCategory = async (id, newLabel) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ label: newLabel })
        .eq('id', id)
        // garde-fou : on laisse aussi admin (policy le permet), sinon restreint à l'user
        .or(`user_id.eq.${user?.id},user_id.is.null`)
      if (error) throw error
      await fetchCategoriesInternal()
      show('Catégorie modifiée', 'success')
      return { error: null }
    } catch (e) {
      console.error(`Erreur modification catégorie : ${formatErr(e)}`)
      show('Erreur lors de la modification', 'error')
      return { error: e }
    }
  }

  const deleteCategory = async value => {
    // ⚠️ Ton UI passe "value" (slug), pas "id"
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('value', value)
        .eq('user_id', user?.id) // on ne supprime que les catégories de l'utilisateur

      if (error) throw error

      await fetchCategoriesInternal()
      show('Catégorie supprimée', 'success')
      return { error: null }
    } catch (e) {
      console.error(`Erreur suppression catégorie : ${formatErr(e)}`)
      show('Impossible de supprimer la catégorie', 'error')
      return { error: e }
    }
  }

  // Exposer refresh avec useCallback pour stabilité de référence
  const refresh = useCallback(() => {
    return fetchCategoriesInternal()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
