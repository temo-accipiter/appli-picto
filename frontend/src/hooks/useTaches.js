/**
 * Hook : useTaches
 *
 * Rôle :
 *   Gère la liste complète des tâches côté main (non filtré par DnD) :
 *     - Chargement initial et rechargement via `reload`
 *     - Bascule du statut 'fait' pour une tâche
 *     - Réinitialisation globale du statut 'fait' pour toutes les tâches
 *     - Mise à jour locale de l'ordre des tâches et persistance en base
 *
 * Arguments :
 *   - reload: number = 0    // incrémenter pour forcer le rechargement des tâches
 *
 * Retourne un objet :
 *   {
 *     taches: Array<{
 *       id: number,
 *       label: string,
 *       categorie: string,
 *       aujourdhui?: 0|1,
 *       fait: 0|1,
 *       position?: number
 *     }>,
 *     setTaches: Function,                      // permet de mettre à jour manuellement le state
 *     toggleFait(id: number, current: boolean|number): Promise<void>,
 *     resetFait(): Promise<void>,
 *     updatePosition(ordered: Array): void
 *   }
 *
 * Utilisation :
 *   const { taches, toggleFait, resetFait, updatePosition } = useTaches(reload)
 */

import { useEffect, useState } from 'react'
import { fetchTaches, patchTache, patchResetFait } from '@/utils/api'

export function useTaches(reload = 0) {
  const [taches, setTaches] = useState([])

  // Charge à l’ouverture et à chaque reload
  useEffect(() => {
    fetchTaches('position')
      .then((data) => setTaches(data))
      .catch(console.error)
  }, [reload])

  // Bascule "fait" et renvoie une promise
  const toggleFait = (id, current) => {
    return patchTache(id, { fait: !current }).then(() =>
      setTaches((prev) =>
        prev.map((t) => (t.id === id ? { ...t, fait: current ? 0 : 1 } : t))
      )
    )
  }

  // Remet tout à 0
  const resetFait = () => {
    return patchResetFait().then(() =>
      setTaches((prev) => prev.map((t) => ({ ...t, fait: 0 })))
    )
  }

  // Réordonne et sauvegarde localement et en base
  const updatePosition = (ordered) => {
    ordered.forEach((t, idx) =>
      patchTache(t.id, { position: idx }).catch(console.error)
    )
    setTaches(ordered)
  }

  return { taches, setTaches, toggleFait, resetFait, updatePosition }
}
