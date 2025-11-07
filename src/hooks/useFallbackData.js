// src/utils/useFallbackData.js
// Fallback data loader : utilisé seulement si on a VRAIMENT quelque chose à afficher
// (ou en cas d'erreur réseau), sinon renvoie null pour laisser l'UI afficher "vide".
//
// Règles :
// - Si pas d'utilisateur/auth non prêt → fallbackData = null
// - Si requêtes OK ET 0 tâche + 0 récompense + 0 catégorie → fallbackData = null  (🔧 changement clé)
// - Si on a des données (≥1) OU des erreurs → fallbackData = { ... } (permet à l'UI d'afficher ce qu'on a)
// - loading reflète l'état de la requête fallback uniquement (pas l'état global de la page)

import { AuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/utils/supabaseClient'
import { useContext, useEffect, useState } from 'react'

export function useFallbackData() {
  const { user, authReady } = useContext(AuthContext)
  const [fallbackData, setFallbackData] = useState(null) // null = pas de fallback à utiliser
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Pas de user → aucun fallback côté compte authentifié
    if (!authReady || !user) {
      setFallbackData(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const loadFallbackData = async () => {
      setLoading(true)
      try {
        // Tâches
        const { data: tasks, error: tasksError } = await supabase
          .from('taches')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Récompenses
        const { data: rewards, error: rewardsError } = await supabase
          .from('recompenses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Catégories
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (cancelled) return

        const safe = {
          tasks: tasks || [],
          rewards: rewards || [],
          categories: categories || [],
          errors: {
            tasks: tasksError || null,
            rewards: rewardsError || null,
            categories: categoriesError || null,
          },
          meta: {
            // vrai si au moins une collection contient des éléments
            hasAny:
              (tasks?.length || 0) > 0 ||
              (rewards?.length || 0) > 0 ||
              (categories?.length || 0) > 0,
            // vrai si au moins une requête a échoué (timeout/RLS/etc.)
            hasError: !!tasksError || !!rewardsError || !!categoriesError,
          },
        }

        // 🔧 Changement FONDAMENTAL :
        // - Si utilisateur AUTHENTIFIÉ et que TOUT est vide et SANS erreur → pas de fallback
        if (!safe.meta.hasAny && !safe.meta.hasError) {
          setFallbackData(null)
        } else {
          setFallbackData(safe)
        }
      } catch (error) {
        if (cancelled) return
        console.error('❌ useFallbackData: erreur:', error)
        // En cas d’exception globale, on renvoie un fallback "vide" mais marqué en erreur
        setFallbackData({
          tasks: [],
          rewards: [],
          categories: [],
          errors: { general: error },
          meta: { hasAny: false, hasError: true },
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFallbackData()
    return () => {
      cancelled = true
    }
  }, [authReady, user])

  return { fallbackData, loading }
}

export default useFallbackData
