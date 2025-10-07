// src/hooks/useDemoData.js
// ⚠️ Déprécié : utiliser `useDemoCards`.
// ⛔ Désormais, NE FOURNIT des démos QUE pour les visiteurs (non authentifiés).

import { useEffect } from 'react'
import useDemoCards from './useDemoCards'
import { useAuth } from '@/hooks' // garde la compat avec ton barrel de hooks

export default function useDemoData() {
  const { user, authReady } = useAuth()

  useEffect(() => {
    // Avertissement non bloquant (une seule fois)
    console.warn(
      '[useDemoData] Déprécié — utilisez useDemoCards. (Gate = visiteurs uniquement)'
    )
  }, [])

  // Si l’auth n’est pas prête → pas de données démo (évite clignotements)
  if (!authReady) {
    return { tasks: [], rewards: [], loading: true, error: null }
  }

  // ✅ Utilisateur connecté → AUCUNE donnée démo
  if (user) {
    return { tasks: [], rewards: [], loading: false, error: null }
  }

  // 🟢 Visiteur → autorisé à recevoir les démos
  const { demoTasks, demoRewards, loading, error } = useDemoCards()
  return {
    tasks: demoTasks,
    rewards: demoRewards,
    loading,
    error,
  }
}
