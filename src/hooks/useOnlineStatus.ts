// src/hooks/useOnlineStatus.ts — S8 Offline
//
// Détecte l'état de la connexion réseau du navigateur.
//
// ⚠️ RÈGLES CONTRAT §4.4
// - Autorisé offline : exécuter timeline, valider étapes (queue locale), pause/reprise
// - Interdit offline : CRUD cartes/catégories/timeline, slots, jetons, session reset
//
// ⚠️ RÈGLE §6.2 (Tableau)
// Ce hook NE DOIT PAS être utilisé pour afficher un indicateur en Contexte Tableau.
// L'état offline est invisible pour l'enfant.
//
// ⚠️ LOCAL-ONLY (§1.4)
// L'état réseau est local-only, jamais persisté en DB.

import { useState, useEffect } from 'react'

interface UseOnlineStatusReturn {
  /** true si le navigateur est connecté au réseau */
  isOnline: boolean
}

/**
 * Détecte l'état de la connexion réseau.
 *
 * Initialise avec `navigator.onLine` puis écoute les événements
 * `online` / `offline` pour mise à jour en temps réel.
 *
 * @example
 * ```tsx
 * // Dans un composant Édition uniquement
 * const { isOnline } = useOnlineStatus()
 * if (!isOnline) showToast('Indisponible hors connexion', 'warning')
 * ```
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(
    // SSR-safe : côté serveur on suppose online
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Synchroniser avec l'état réel au montage (cas où on monte déjà offline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
