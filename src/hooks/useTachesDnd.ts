import { isAbortLike, useAuth, useToast, useI18n, withAbortSafe } from '@/hooks'
import { supabase } from '@/utils/supabaseClient'
import { useCallback, useEffect, useState, useRef } from 'react'

interface Tache {
  id: string | number
  fait: boolean | number
  [key: string]: unknown
}

// Sérialise proprement les erreurs (évite les soucis d'inspecteur Safari)
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

export default function useTachesDnd(onChange, reload = 0) {
  const [taches, setTaches] = useState<Tache[]>([])
  const [doneMap, setDone] = useState<Record<string | number, boolean>>({})
  const { user } = useAuth()
  const { show } = useToast()
  const { t } = useI18n()

  // Ref pour éviter la boucle infinie avec onChange dans les dépendances
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const loadTaches = useCallback(
    async (retryCount = 0) => {
      if (!user?.id) return

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 useTachesDnd: Chargement tâches pour user', user.id)
      }

      try {
        const { data, error, aborted } = await withAbortSafe(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from('taches')
            .select('*')
            .eq('user_id', user.id) // 🔐 visibilité sécurisée
            .eq('aujourdhui', true)
            .order('position', { ascending: true })
        )

        // 1) Requête annulée (Firefox/Safari) → on sort sans bruit
        if (aborted) return

        // 2) Erreur "abort-like" → on ignore aussi
        if (error && isAbortLike(error)) {
          if (process.env.NODE_ENV === 'development')
            console.debug('useTachesDnd: abort/transitoire ignoré')
          return
        }

        // 3) Autre erreur → logs + retry (inchangé, logs sûrs)
        if (error) {
          console.error(`Erreur fetch Supabase : ${formatErr(error)}`)
          if (process.env.NODE_ENV === 'development') {
            console.warn("Détails de l'erreur Supabase:", error) // objet "plain"
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
            const delay =
              retryCount === 0 ? 2000 : retryCount === 1 ? 4000 : 6000
            console.warn(
              `Tentative de reconnexion ${retryCount + 1}/3 dans ${delay / 1000}s…`
            )
            setTimeout(() => loadTaches(retryCount + 1), delay)
          }
          return
        }

        // 4) Ne pas alerter si data === null (déjà géré par aborted ci-dessus)
        if (data !== null && !Array.isArray(data)) {
          console.warn('Données invalides reçues de Supabase:', data)
          setTaches([])
          setDone({})
          onChangeRef.current?.(0, 0)
          return
        }

        const rows = data || []
        setTaches(rows)

        const initDone = Object.fromEntries(
          rows.map(t => [t.id, t.fait === true || t.fait === 1])
        )
        setDone(initDone)

        const doneCount = Object.values(initDone).filter(Boolean).length
        onChangeRef.current?.(doneCount, rows.length)
      } catch (err) {
        // Abort (unmount/re-render) → pas d'erreur rouge
        if (isAbortLike(err)) {
          if (process.env.NODE_ENV === 'development')
            console.debug('useTachesDnd: abort/transitoire ignoré (catch)')
          return
        }

        console.error(
          `Erreur inattendue lors du chargement des tâches: ${formatErr(err)}`
        )
        if (process.env.NODE_ENV === 'development')
          console.warn("Détails de l'erreur:", err)

        if (retryCount < 3) {
          const delay = 1000 * (retryCount + 1)
          console.warn(
            `Tentative de reconnexion après erreur inattendue ${retryCount + 1}/3 dans ${delay / 1000}s…`
          )
          setTimeout(() => loadTaches(retryCount + 1), delay)
        }
      }
    },
    [user?.id]
  )

  useEffect(() => {
    loadTaches()
  }, [loadTaches, reload])

  const toggleDone = async (id, newDone) => {
    if (!user?.id) return

    try {
      const { error, aborted } = await withAbortSafe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('taches')
          .update({ fait: newDone })
          .eq('id', id)
          .eq('user_id', user.id)
      )

      if (aborted || (error && isAbortLike(error))) {
        if (process.env.NODE_ENV === 'development')
          console.debug('toggleDone: abort/transitoire ignoré')
        return
      }
      if (error) {
        console.error(`Erreur mise à jour tâche: ${formatErr(error)}`)
        if (process.env.NODE_ENV === 'development')
          console.warn("Détails de l'erreur:", error)
        show(t('toasts.taskUpdateError'), 'error')
        return
      }

      const updated = { ...doneMap, [id]: newDone }
      setDone(updated)

      const count = Object.values(updated).filter(Boolean).length
      onChangeRef.current?.(count, taches.length)
      // Toast de succès discret pour ne pas polluer l'UI en drag-and-drop
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Tâche mise à jour avec succès')
      }
    } catch (err) {
      if (isAbortLike(err)) {
        if (process.env.NODE_ENV === 'development')
          console.debug('toggleDone: abort/transitoire ignoré (catch)')
        return
      }
      console.error(
        `Erreur inattendue lors de la mise à jour de la tâche: ${formatErr(err)}`
      )
      if (process.env.NODE_ENV === 'development')
        console.warn("Détails de l'erreur:", err)
      show(t('toasts.taskUpdateError'), 'error')
    }
  }

  const resetAll = async () => {
    if (!user?.id) return

    try {
      const { error, aborted } = await withAbortSafe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('taches')
          .update({ fait: false })
          .eq('aujourdhui', true)
          .eq('user_id', user.id)
      )

      if (aborted || (error && isAbortLike(error))) {
        if (process.env.NODE_ENV === 'development')
          console.debug('resetAll: abort/transitoire ignoré')
        return
      }
      if (error) {
        console.error(`Erreur reset tâches: ${formatErr(error)}`)
        if (process.env.NODE_ENV === 'development')
          console.warn("Détails de l'erreur:", error)
        show(t('toasts.taskResetError'), 'error')
        return
      }

      const reset = Object.fromEntries(taches.map(t => [t.id, false]))
      setDone(reset)
      onChangeRef.current?.(0, taches.length)
      show(t('toasts.allTasksReset'), 'success')
    } catch (err) {
      if (isAbortLike(err)) {
        if (process.env.NODE_ENV === 'development')
          console.debug('resetAll: abort/transitoire ignoré (catch)')
        return
      }
      console.error(
        `Erreur inattendue lors du reset des tâches: ${formatErr(err)}`
      )
      if (process.env.NODE_ENV === 'development')
        console.warn("Détails de l'erreur:", err)
      show(t('toasts.taskResetError'), 'error')
    }
  }

  const swapTasks = (activeId: string, overId: string) => {
    let newList: Tache[] = []
    setTaches(prev => {
      const fromIndex = prev.findIndex(t => t.id.toString() === activeId)
      const toIndex = prev.findIndex(t => t.id.toString() === overId)

      if (fromIndex === -1 || toIndex === -1) return prev

      // Swap : échange direct des positions
      const arr = [...prev]
      const fromItem = arr[fromIndex]
      const toItem = arr[toIndex]

      // Vérification de sécurité (ne devrait jamais être undefined après findIndex)
      if (!fromItem || !toItem) return prev

      arr[fromIndex] = toItem
      arr[toIndex] = fromItem

      newList = arr
      return arr
    })
    return newList
  }

  const saveOrder = async list => {
    if (!user?.id) return

    try {
      // Mettre à jour l'état local immédiatement pour une UI fluide
      setTaches(list)

      const batchSize = 5
      for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize)

        await Promise.all(
          batch.map((t, index) =>
            withAbortSafe(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (supabase as any)
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
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Pas besoin de recharger, l'état local est déjà à jour
    } catch (error) {
      if (isAbortLike(error)) {
        if (process.env.NODE_ENV === 'development')
          console.debug('saveOrder: abort/transitoire ignoré')
        return
      }
      console.error(`Erreur sauvegarde ordre: ${formatErr(error)}`)
      if (process.env.NODE_ENV === 'development')
        console.warn("Détails de l'erreur:", error)

      // En cas d'erreur, recharger pour restaurer l'état correct
      await loadTaches()
    }
  }

  return {
    taches,
    doneMap,
    toggleDone,
    resetAll,
    swapTasks,
    saveOrder,
  }
}
