import { useCallback, useState } from 'react'

/**
 * Hook de confirmation inline 1-clic (pattern TSA anti-surprise).
 *
 * Principe :
 * - 1er appel requireConfirm(id) → demande confirmation (état stable)
 * - L'appelant exécute l'action si isConfirming(id) === true
 * - cancelConfirm() → annule sans déclencher d'action
 *
 * ⚠️ UX TSA (anti-surprise) :
 * - L'état de confirmation reste stable jusqu'à action explicite
 * - Aucun reset automatique, aucun changement de focus implicite
 * - Aucune logique métier encapsulée
 */
export function useInlineConfirm() {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const requireConfirm = useCallback((id: string) => {
    setConfirmId(id)
  }, [])

  const cancelConfirm = useCallback(() => {
    setConfirmId(null)
  }, [])

  const isConfirming = useCallback(
    (id: string) => confirmId === id,
    [confirmId]
  )

  return { requireConfirm, cancelConfirm, isConfirming }
}
