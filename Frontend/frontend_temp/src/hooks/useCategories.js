// src/hooks/useCategories.js
import { useState, useEffect } from 'react'

export default function useCategories(reload = 0) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Chargement initial & à chaque « reload »
  useEffect(() => {
    setLoading(true)
    fetch('http://localhost:3001/categories')
      .then((res) => {
        if (!res.ok) throw new Error('Erreur chargement catégories')
        return res.json()
      })
      .then((data) => {
        setCategories(data)
      })
      .catch((err) => {
        console.error(err)
        setError(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [reload])

  // ➕ Ajoute une catégorie
  const addCategory = async ({ value, label }) => {
    const res = await fetch('http://localhost:3001/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, label }),
    })
    if (!res.ok) throw new Error('Échec addCategory')
    const cat = await res.json()
    setCategories((prev) => [...prev, cat])
    return cat
  }

  // 🗑️ Supprime une catégorie (réassignation back-side déjà faite)
  const deleteCategory = async (value) => {
    const res = await fetch(
      `http://localhost:3001/categories/${encodeURIComponent(value)}`,
      { method: 'DELETE' }
    )
    if (!res.ok) throw new Error('Échec deleteCategory')
    setCategories((prev) => prev.filter((c) => c.value !== value))
  }

  return { categories, loading, error, addCategory, deleteCategory }
}
