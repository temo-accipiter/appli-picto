import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import {
  makeNoDoubleSpaces,
  makeNoEdgeSpaces,
  makeValidateNotEmpty,
} from '@/utils'

interface CategoryOption {
  value: string | number
  label: string
}

interface UseCategoryValidationParams {
  categories: CategoryOption[]
  newCategory: string
  t: TFunction
}

interface UseCategoryValidationReturn {
  validationRules: Array<(val: string) => string>
  hasError: boolean
}

/**
 * Hook personnalisé pour gérer la validation des catégories
 * Centralise toute la logique de validation pour simplifier ModalCategory
 *
 * @param categories - Liste des catégories existantes
 * @param newCategory - Valeur du champ nouvelle catégorie
 * @param t - Fonction de traduction i18n
 * @returns validationRules et hasError
 */
export function useCategoryValidation({
  categories,
  newCategory,
  t,
}: UseCategoryValidationParams): UseCategoryValidationReturn {
  // Créer les fonctions de validation i18n avec useMemo
  const validateNotEmpty = useMemo(() => makeValidateNotEmpty(t), [t])
  const noEdgeSpaces = useMemo(() => makeNoEdgeSpaces(t), [t])
  const noDoubleSpaces = useMemo(() => makeNoDoubleSpaces(t), [t])

  // Règle custom : vérifier si catégorie existe déjà (insensible à la casse)
  const validateUnique = useMemo(
    () => (val: string) => {
      const labelClean = val.trim().replace(/\s+/g, ' ').toLowerCase()
      const exists = categories.some(
        cat => cat.label.trim().toLowerCase() === labelClean
      )
      return exists ? t('edition.categoryExists') : ''
    },
    [categories, t]
  )

  // Toutes les règles de validation dans l'ordre
  const validationRules = useMemo(
    () => [validateNotEmpty, noEdgeSpaces, noDoubleSpaces, validateUnique],
    [validateNotEmpty, noEdgeSpaces, noDoubleSpaces, validateUnique]
  )

  // Vérifier si erreur présente
  const hasError = useMemo(
    () => validationRules.some(rule => rule(newCategory)),
    [validationRules, newCategory]
  )

  return {
    validationRules,
    hasError,
  }
}
