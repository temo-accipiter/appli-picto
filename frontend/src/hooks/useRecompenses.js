/**
 * Rôle :
 *   Gère la liste des récompenses côté client :
 *     - Chargement initial et rechargement via un indicateur `reload`
 *     - Création d’une nouvelle récompense
 *     - Suppression d’une récompense existante
 *     - Sélection d’une récompense du jour (désélectionne les autres)
 *     - Désélection de toutes les récompenses
 */

import { useState, useEffect } from 'react'
import {
  getRecompenses,
  addRecompense,
  deleteRecompense as apiDelete,
  selectRecompense as apiSelect,
  deselectAllRecompenses as apiDeselectAll,
} from '@/utils'

export default function useRecompenses(reload = 0) {
  const [recompenses, setRecompenses] = useState([])

  // 🔄 Rechargement à l’ouverture et à chaque "reload"
  useEffect(() => {
    getRecompenses().then(setRecompenses).catch(console.error)
  }, [reload])

  // ➕ Création
  const createRecompense = async (formData) => {
    const nouvelle = await addRecompense(formData)
    setRecompenses((prev) => [...prev, nouvelle])
    return nouvelle
  }

  // 🗑️ Suppression
  const deleteRecompense = async (id) => {
    await apiDelete(id)
    setRecompenses((prev) => prev.filter((r) => r.id !== id))
  }

  // ✅ Sélection (on désélectionne tout puis on sélectionne)
  const selectRecompense = async (id) => {
    await apiDeselectAll()
    await apiSelect(id)
    setRecompenses((prev) =>
      prev.map((r) => ({ ...r, selected: r.id === id ? 1 : 0 }))
    )
  }

  // ❎ Tout désélectionner
  const deselectAll = async () => {
    await apiDeselectAll()
    setRecompenses((prev) => prev.map((r) => ({ ...r, selected: 0 })))
  }

  return {
    recompenses,
    createRecompense,
    deleteRecompense,
    selectRecompense,
    deselectAll,
  }
}
