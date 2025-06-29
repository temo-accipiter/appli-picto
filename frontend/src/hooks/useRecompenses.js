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

  // 🔄 Chargement à l’ouverture et à chaque "reload"
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

  // ✅ Sélection unique
  const selectRecompense = async (id) => {
    await apiDeselectAll()
    await apiSelect(id)
    setRecompenses((prev) =>
      prev.map((r) => ({ ...r, selected: r.id === id ? 1 : 0 }))
    )
  }

  // ❎ Désélection totale
  const deselectAll = async () => {
    await apiDeselectAll()
    setRecompenses((prev) => prev.map((r) => ({ ...r, selected: 0 })))
  }

  // ✏️ Modification du label (PATCH + update local)
  const updateLabel = async (id, label) => {
    const res = await fetch(`http://localhost:3001/recompenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    })
    if (!res.ok) throw new Error('Échec updateRecompenseLabel')

    setRecompenses((prev) =>
      prev.map((r) => (r.id === id ? { ...r, label } : r))
    )
  }

  return {
    recompenses,
    createRecompense,
    deleteRecompense,
    selectRecompense,
    deselectAll,
    updateLabel, // ✅ essentiel pour la sauvegarde
  }
}
