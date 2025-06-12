/**
 * Hook : useTachesEdition
 *
 * Rôle :
 *   Charge et gère l’édition des tâches :
 *     – fetch initial des tâches
 *     – bascule “aujourd’hui” (et reset “fait”)
 *     – mise à jour du label
 *     – mise à jour de la catégorie
 *     – suppression d’une tâche
 *     – reset global (toutes tâches à “aujourd’hui” = 0)
 *
 * Args :
 *   - reload (number) : valeur qui, à chaque changement, déclenche un rechargement des tâches
 *
 * Retourne :
 *   - taches: Array<{ id, label, categorie, aujourdhui, fait, imagePath? }>
 *   - toggleAujourdhui(id: string|number, current: boolean|number): Promise<void>
 *   - updateLabel(id: string|number, label: string): Promise<void>
 *   - updateCategorie(id: string|number, categorie: string): Promise<void>
 *   - deleteTache(id: string|number): Promise<void>
 *   - resetEdition(): Promise<void>
 */

import { useState, useEffect } from 'react'
import {
  fetchTaches,
  patchTache,
  deleteTache as apiDeleteTache,
  patchResetEdition,
} from '@/utils/api'

export default function useTachesEdition(reload = 0) {
  const [taches, setTaches] = useState([])

  // 🔄 Charge à l’ouverture et à chaque reload
  useEffect(() => {
    fetchTaches().then(setTaches).catch(console.error)
  }, [reload])

  // ✅ Bascule "aujourdhui" (et remet fait à 0)
  const toggleAujourdhui = (id, current) =>
    patchTache(id, { aujourdhui: current ? 0 : 1, fait: 0 })
      .then(() => {
        setTaches((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, aujourdhui: current ? 0 : 1, fait: 0 } : t
          )
        )
      })
      .catch(console.error)

  // ✏️ Mise à jour du label
  const updateLabel = (id, label) =>
    patchTache(id, { label })
      .then(() => {
        setTaches((prev) =>
          prev.map((t) => (t.id === id ? { ...t, label } : t))
        )
      })
      .catch(console.error)

  // 📂 Mise à jour de la catégorie
  const updateCategorie = (id, categorie) =>
    patchTache(id, { categorie })
      .then(() => {
        setTaches((prev) =>
          prev.map((t) => (t.id === id ? { ...t, categorie } : t))
        )
      })
      .catch(console.error)

  // 🗑️ Suppression
  const deleteTache = (id) =>
    apiDeleteTache(id)
      .then(() => {
        setTaches((prev) => prev.filter((t) => t.id !== id))
      })
      .catch(console.error)

  // 🔄 Reset édition (aujourdhui → 0)
  const resetEdition = () =>
    patchResetEdition()
      .then(() => {
        setTaches((prev) => prev.map((t) => ({ ...t, aujourdhui: 0 })))
      })
      .catch(console.error)

  return {
    taches,
    toggleAujourdhui,
    updateLabel,
    updateCategorie,
    deleteTache,
    resetEdition,
  }
}
