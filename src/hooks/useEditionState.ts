import { useCallback, useState } from 'react'

/**
 * Hook partagé pour la logique d'état d'édition inline.
 *
 * Factorise le noyau commun à TachesEdition, RecompensesEdition,
 * CardsEdition : drafts, errors, successIds + primitives associées.
 *
 * ⚠️ Ce hook N'expose PAS de handleBlur.
 * Chaque composant compose son propre handleBlur avec les primitives
 * ci-dessous, car la synchronicité (sync vs async) et la lecture de
 * result.error diffèrent selon le contrat de chaque hook de données.
 *
 * ⚠️ Aucune logique métier spécifique (planning / jetons / séquençage).
 */

export interface UseEditionStateOptions {
  /** Message d'erreur de validation, déjà traduit via t() */
  validationErrorMessage: string
  /** Durée du feedback succès en ms (défaut : 600) */
  successDuration?: number
}

export interface UseEditionStateReturn {
  drafts: Record<string | number, string>
  errors: Record<string | number, string>
  successIds: Set<string | number>
  /** Met à jour drafts[id] et vide errors[id] */
  handleChange: (id: string | number, value: string) => void
  /** Valide un label : retourne le message d'erreur ou '' si valide */
  validateLabel: (label: string) => string
  /** Supprime drafts[id] sans affecter les autres entrées */
  clearDraft: (id: string | number) => void
  /** Supprime errors[id] sans affecter les autres entrées */
  clearError: (id: string | number) => void
  /** Ajoute errors[id] = msg */
  setError: (id: string | number, msg: string) => void
  /** Ajoute id à successIds puis le retire après successDuration */
  triggerSuccess: (id: string | number) => void
}

export function useEditionState({
  validationErrorMessage,
  successDuration = 600,
}: UseEditionStateOptions): UseEditionStateReturn {
  const [drafts, setDrafts] = useState<Record<string | number, string>>({})
  const [errors, setErrors] = useState<Record<string | number, string>>({})
  const [successIds, setSuccessIds] = useState<Set<string | number>>(
    () => new Set()
  )

  const handleChange = useCallback((id: string | number, value: string) => {
    setDrafts(prev => ({ ...prev, [id]: value }))
    setErrors(prev => ({ ...prev, [id]: '' }))
  }, [])

  const validateLabel = useCallback(
    (label: string): string => {
      const trimmed = label.trim()
      if (!trimmed || trimmed !== label || /\s{2,}/.test(label)) {
        return validationErrorMessage
      }
      return ''
    },
    [validationErrorMessage]
  )

  const clearDraft = useCallback((id: string | number) => {
    setDrafts(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const clearError = useCallback((id: string | number) => {
    setErrors(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const setError = useCallback((id: string | number, msg: string) => {
    setErrors(prev => ({ ...prev, [id]: msg }))
  }, [])

  const triggerSuccess = useCallback(
    (id: string | number) => {
      setSuccessIds(prev => new Set([...prev, id]))
      setTimeout(() => {
        setSuccessIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, successDuration)
    },
    [successDuration]
  )

  return {
    drafts,
    errors,
    successIds,
    handleChange,
    validateLabel,
    clearDraft,
    clearError,
    setError,
    triggerSuccess,
  }
}
