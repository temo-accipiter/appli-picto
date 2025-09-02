import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks'
import { supabase } from '@/utils'
import { withAbortSafe, isAbortLike } from '@/hooks'

// Sérialise proprement les erreurs (évite les soucis d’inspecteur Safari)
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

export default function useTachesDnd(onChange) {
  const [taches, setTaches] = useState([])
  const [doneMap, setDone] = useState({})
  const { user } = useAuth()

  const loadTaches = useCallback(async (retryCount = 0) => {
    if (!user?.id) return

    try {
      const { data, error, aborted } = await withAbortSafe(
        supabase
          .from('taches')
          .select('*')
          .eq('user_id', user.id)          // 🔐 visibilité sécurisée
          .eq('aujourdhui', true)
          .order('position', { ascending: true })
      )

      // 1) Requête annulée (Firefox/Safari) → on sort sans bruit
      if (aborted) return

      // 2) Erreur "abort-like" → on ignore aussi
      if (error && isAbortLike(error)) {
        if (import.meta.env.DEV) console.debug('useTachesDnd: abort/transitoire ignoré')
        return
      }

      // 3) Autre erreur → logs + retry (inchangé, logs sûrs)
      if (error) {
        console.error(`❌ Erreur fetch Supabase : ${formatErr(error)}`)
        if (import.meta.env.DEV) {
          console.warn('🔍 Détails de l’erreur Supabase:', error) // objet “plain”
        }

        // Retry seulement pour erreurs réseau (hors abort), max 3 tentatives
        const msg = String(error.message || '').toLowerCase()
        const transient =
          msg.includes('networkerror') ||
          msg.includes('failed to fetch') ||
          msg.includes('fetch resource') ||
          msg.includes('timeout') ||
          msg.includes('temporarily') ||
          msg.includes('dns')

        if (retryCount < 3 && transient) {
          const delay = retryCount === 0 ? 2000 : retryCount === 1 ? 4000 : 6000
          console.warn(`🔄 Tentative de reconnexion ${retryCount + 1}/3 dans ${delay / 1000}s…`)
          setTimeout(() => loadTaches(retryCount + 1), delay)
        }
        return
      }

      // 4) Ne pas alerter si data === null (déjà géré par aborted ci-dessus)
      if (data !== null && !Array.isArray(data)) {
        console.warn('⚠️ Données invalides reçues de Supabase:', data)
        setTaches([])
        setDone({})
        onChange?.(0, 0)
        return
      }

      const rows = data || []
      setTaches(rows)

      const initDone = Object.fromEntries(
        rows.map((t) => [t.id, t.fait === true || t.fait === 1])
      )
      setDone(initDone)

      const doneCount = Object.values(initDone).filter(Boolean).length
      onChange?.(doneCount, rows.length)
    } catch (err) {
      // Abort (unmount/re-render) → pas d’erreur rouge
      if (isAbortLike(err)) {
        if (import.meta.env.DEV) console.debug('useTachesDnd: abort/transitoire ignoré (catch)')
        return
      }

      console.error(`❌ Erreur inattendue lors du chargement des tâches: ${formatErr(err)}`)
      if (import.meta.env.DEV) console.warn('🔍 Détails de l’erreur:', err)

      if (retryCount < 3) {
        const delay = 1000 * (retryCount + 1)
        console.warn(`🔄 Tentative de reconnexion après erreur inattendue ${retryCount + 1}/3 dans ${delay / 1000}s…`)
        setTimeout(() => loadTaches(retryCount + 1), delay)
      }
    }
  }, [onChange, user?.id])

  useEffect(() => {
    loadTaches()
  }, [loadTaches])

  const toggleDone = async (id, wasDone) => {
    try {
      const { error, aborted } = await withAbortSafe(
        supabase
          .from('taches')
          .update({ fait: !wasDone })
          .eq('id', id)
          .eq('user_id', user.id)
      )

      if (aborted || (error && isAbortLike(error))) {
        if (import.meta.env.DEV) console.debug('toggleDone: abort/transitoire ignoré')
        return
      }
      if (error) {
        console.error(`❌ Erreur mise à jour tâche: ${formatErr(error)}`)
        if (import.meta.env.DEV) console.warn('🔍 Détails de l’erreur:', error)
        return
      }

      const updated = { ...doneMap, [id]: !wasDone }
      setDone(updated)

      const count = Object.values(updated).filter(Boolean).length
      onChange?.(count, taches.length)
    } catch (err) {
      if (isAbortLike(err)) {
        if (import.meta.env.DEV) console.debug('toggleDone: abort/transitoire ignoré (catch)')
        return
      }
      console.error(`❌ Erreur inattendue lors de la mise à jour de la tâche: ${formatErr(err)}`)
      if (import.meta.env.DEV) console.warn('🔍 Détails de l’erreur:', err)
    }
  }

  const resetAll = async () => {
    try {
      const { error, aborted } = await withAbortSafe(
        supabase
          .from('taches')
          .update({ fait: false })
          .eq('aujourdhui', true)
          .eq('user_id', user.id)
      )

      if (aborted || (error && isAbortLike(error))) {
        if (import.meta.env.DEV) console.debug('resetAll: abort/transitoire ignoré')
        return
      }
      if (error) {
        console.error(`❌ Erreur reset tâches: ${formatErr(error)}`)
        if (import.meta.env.DEV) console.warn('🔍 Détails de l’erreur:', error)
        return
      }

      const reset = Object.fromEntries(taches.map((t) => [t.id, false]))
      setDone(reset)
      onChange?.(0, taches.length)
    } catch (err) {
      if (isAbortLike(err)) {
        if (import.meta.env.DEV) console.debug('resetAll: abort/transitoire ignoré (catch)')
        return
      }
      console.error(`❌ Erreur inattendue lors du reset des tâches: ${formatErr(err)}`)
      if (import.meta.env.DEV) console.warn('🔍 Détails de l’erreur:', err)
    }
  }

  const moveTask = (activeId, overId) => {
    let newList = []
    setTaches((prev) => {
      const oldIndex = prev.findIndex((t) => t.id.toString() === activeId)
      const newIndex = prev.findIndex((t) => t.id.toString() === overId)
      const arr = [...prev]
      const [moved] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, moved)
      newList = arr
      return arr
    })
    return newList
  }

  const saveOrder = async (list) => {
    try {
      const batchSize = 5
      for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize)

        await Promise.all(
          batch.map((t, index) =>
            withAbortSafe(
              supabase
                .from('taches')
                .update({ position: i + index })
                .eq('id', t.id)
                .eq('user_id', user.id)
            ).then(({ error, aborted }) => {
              if (aborted || (error && isAbortLike(error))) return
              if (error) throw error
            })
          )
        )

        if (i + batchSize < list.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      await loadTaches()
    } catch (error) {
      if (isAbortLike(error)) {
        if (import.meta.env.DEV) console.debug('saveOrder: abort/transitoire ignoré')
        return
      }
      console.error(`❌ Erreur sauvegarde ordre: ${formatErr(error)}`)
      if (import.meta.env.DEV) console.warn('🔍 Détails de l’erreur:', error)

      setTimeout(() => saveOrder(list), 2000)
    }
  }

  return {
    taches,
    doneMap,
    toggleDone,
    resetAll,
    moveTask,
    saveOrder,
  }
}
