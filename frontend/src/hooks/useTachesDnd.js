/**
 * Hook : useTachesDnd
 *
 * Rôle :
 *   Gère la liste des tâches du jour avec drag & drop :
 *     1. Chargement et tri des tâches filtrées (aujourd'hui = 1).
 *     2. Comptabilisation et bascule du statut 'fait'.
 *     3. Réinitialisation de tous les 'faits'.
 *     4. Réordonnancement local des tâches (drag & drop).
 *     5. Persistance de l'ordre en base de données.
 *
 * Arguments :
 *   - onChange(doneCount: number, totalCount: number): void
 *       Callback appelé après chaque changement (coché, reset, chargement)
 *       avec le nombre de tâches faites et le nombre total.
 *
 * Retourne un objet :
 *   {
 *     taches: Array<{ id, label, aujourdhui, fait, position }>,
 *     doneMap: Record<id, boolean>,
 *     toggleDone(id: string|number, wasDone: boolean): void,
 *     resetAll(): void,
 *     moveTask(activeId: string, overId: string): Array,  // nouvelle liste locale
 *     saveOrder(list: Array): void                       // persiste l'ordre et recharge
 *   }
 *
 * Utilisation :
 *   const { taches, doneMap, toggleDone, resetAll, moveTask, saveOrder } = useTachesDnd(onChange)
 */

import { useState, useEffect, useCallback } from 'react'
import { fetchTaches, patchTache, patchResetFait } from '@/utils/api'

export default function useTachesDnd(onChange) {
  const [taches, setTaches] = useState([])
  const [doneMap, setDone] = useState({})

  // 1️⃣ Charger et trier les tâches « aujourd’hui »
  const loadTaches = useCallback(() => {
    fetchTaches('position') // GET /taches?orderBy=position
      .then((data) => {
        const today = data
          .filter((t) => t.aujourdhui === 1)
          .sort((a, b) => (a.position || 0) - (b.position || 0))
        setTaches(today)

        // Initialiser la map des tâches faites
        const initDone = Object.fromEntries(
          today.map((t) => [t.id, t.fait === 1])
        )
        setDone(initDone)

        // Appeler onChange avec deux nombres (fait / total)
        const doneCount = Object.values(initDone).filter(Boolean).length
        onChange(doneCount, today.length)
      })
      .catch(console.error)
  }, [onChange])

  // Au montage, on charge une première fois
  useEffect(() => {
    loadTaches()
  }, [loadTaches])

  // 2️⃣ Bascule « fait »
  const toggleDone = useCallback(
    (id, wasDone) => {
      patchTache(id, { fait: wasDone ? 0 : 1 })
        .then(() => {
          setDone((prev) => ({ ...prev, [id]: !wasDone }))
          const count = Object.values({ ...doneMap, [id]: !wasDone }).filter(
            Boolean
          ).length
          onChange(count, taches.length)
        })
        .catch(console.error)
    },
    [doneMap, onChange, taches]
  )

  // 3️⃣ Reset des cochés
  const resetAll = useCallback(() => {
    patchResetFait()
      .then(() => {
        const resetMap = Object.fromEntries(taches.map((t) => [t.id, false]))
        setDone(resetMap)
        onChange(0, taches.length)
      })
      .catch(console.error)
  }, [taches, onChange])

  // 4️⃣ Réordonnancement local (renvoie la nouvelle liste)
  const moveTask = useCallback((activeId, overId) => {
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
  }, [])

  // 5️⃣ Sauvegarde en base puis rechargement pour persister l’ordre
  const saveOrder = useCallback(
    (list) => {
      Promise.all(
        list.map((t, i) =>
          patchTache(t.id, { position: i }).catch(console.error)
        )
      )
        .then(() => loadTaches()) // recharger depuis le serveur
        .catch(console.error)
    },
    [loadTaches]
  )

  return {
    taches,
    doneMap,
    toggleDone,
    resetAll,
    moveTask,
    saveOrder,
  }
}
