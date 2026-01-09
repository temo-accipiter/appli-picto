/**
 * Tests pour le hook useCategoryValidation
 *
 * Vérifie :
 * - Génération des règles de validation
 * - Détection catégorie vide
 * - Détection espaces en bordure
 * - Détection doubles espaces
 * - Détection doublons (insensible à la casse)
 * - Flag hasError calculé correctement
 */

import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeAll } from 'vitest'

// Mocks des utils de validation
const { mockMakeValidateNotEmpty, mockMakeNoEdgeSpaces, mockMakeNoDoubleSpaces } =
  vi.hoisted(() => ({
    mockMakeValidateNotEmpty: vi.fn(),
    mockMakeNoEdgeSpaces: vi.fn(),
    mockMakeNoDoubleSpaces: vi.fn(),
  }))

vi.mock('@/utils', () => ({
  makeValidateNotEmpty: mockMakeValidateNotEmpty,
  makeNoEdgeSpaces: mockMakeNoEdgeSpaces,
  makeNoDoubleSpaces: mockMakeNoDoubleSpaces,
}))

describe('useCategoryValidation', () => {
  let useCategoryValidation

  beforeAll(async () => {
    useCategoryValidation = (await import('./useCategoryValidation'))
      .useCategoryValidation
  })

  const mockT = vi.fn((key: string) => {
    const translations: Record<string, string> = {
      'edition.categoryExists': 'Cette catégorie existe déjà',
      'validation.required': 'Ce champ est requis',
      'validation.noEdgeSpaces': 'Pas d\'espaces en début ou fin',
      'validation.noDoubleSpaces': 'Pas de doubles espaces',
    }
    return translations[key] || key
  })

  beforeAll(() => {
    // Setup des fonctions de validation mockées
    mockMakeValidateNotEmpty.mockReturnValue((val: string) =>
      !val.trim() ? 'Ce champ est requis' : ''
    )
    mockMakeNoEdgeSpaces.mockReturnValue((val: string) =>
      val !== val.trim() ? 'Pas d\'espaces en début ou fin' : ''
    )
    mockMakeNoDoubleSpaces.mockReturnValue((val: string) =>
      /\s{2,}/.test(val) ? 'Pas de doubles espaces' : ''
    )
  })

  describe('Validation basique', () => {
    it('doit retourner validationRules et hasError', () => {
      const categories = [
        { value: 1, label: 'Travail' },
        { value: 2, label: 'Maison' },
      ]

      const { result } = renderHook(() =>
        useCategoryValidation({
          categories,
          newCategory: 'École',
          t: mockT,
        })
      )

      expect(result.current.validationRules).toHaveLength(4)
      expect(typeof result.current.hasError).toBe('boolean')
    })
  })

  describe('Détection erreurs', () => {
    it('doit détecter une catégorie vide', () => {
      const categories = [{ value: 1, label: 'Travail' }]

      const { result } = renderHook(() =>
        useCategoryValidation({
          categories,
          newCategory: '',
          t: mockT,
        })
      )

      expect(result.current.hasError).toBe(true)
    })

    it('doit détecter des espaces en bordure', () => {
      const categories = [{ value: 1, label: 'Travail' }]

      const { result } = renderHook(() =>
        useCategoryValidation({
          categories,
          newCategory: ' École ',
          t: mockT,
        })
      )

      expect(result.current.hasError).toBe(true)
    })

    it('doit détecter des doubles espaces', () => {
      const categories = [{ value: 1, label: 'Travail' }]

      const { result } = renderHook(() =>
        useCategoryValidation({
          categories,
          newCategory: 'Ma  catégorie',
          t: mockT,
        })
      )

      expect(result.current.hasError).toBe(true)
    })

    it('doit détecter un doublon (sensible à la casse)', () => {
      const categories = [
        { value: 1, label: 'Travail' },
        { value: 2, label: 'Maison' },
      ]

      const { result } = renderHook(() =>
        useCategoryValidation({
          categories,
          newCategory: 'travail', // Minuscule
          t: mockT,
        })
      )

      // Exécuter la règle de validation unique
      const uniqueRule = result.current.validationRules[3]
      const error = uniqueRule('travail')

      expect(error).toBe('Cette catégorie existe déjà')
    })

    it('doit détecter un doublon avec espaces différents', () => {
      const categories = [{ value: 1, label: 'Ma Catégorie' }]

      const { result } = renderHook(() =>
        useCategoryValidation({
          categories,
          newCategory: 'ma catégorie',
          t: mockT,
        })
      )

      const uniqueRule = result.current.validationRules[3]
      const error = uniqueRule('ma catégorie')

      expect(error).toBe('Cette catégorie existe déjà')
    })
  })

  describe('Validation réussie', () => {
    it('ne doit pas avoir d\'erreur pour une catégorie valide', () => {
      const categories = [
        { value: 1, label: 'Travail' },
        { value: 2, label: 'Maison' },
      ]

      const { result } = renderHook(() =>
        useCategoryValidation({
          categories,
          newCategory: 'École',
          t: mockT,
        })
      )

      expect(result.current.hasError).toBe(false)
    })

    it('ne doit pas avoir d\'erreur pour une catégorie avec accents', () => {
      const categories = [{ value: 1, label: 'Travail' }]

      const { result } = renderHook(() =>
        useCategoryValidation({
          categories,
          newCategory: 'Événements spéciaux',
          t: mockT,
        })
      )

      expect(result.current.hasError).toBe(false)
    })
  })

  describe('Mémoïsation', () => {
    it('ne doit pas recréer validationRules si dépendances inchangées', () => {
      const categories = [{ value: 1, label: 'Travail' }]

      const { result, rerender } = renderHook(
        ({ cats, newCat }) =>
          useCategoryValidation({
            categories: cats,
            newCategory: newCat,
            t: mockT,
          }),
        {
          initialProps: { cats: categories, newCat: 'École' },
        }
      )

      const firstRules = result.current.validationRules

      // Rerender sans changer les props
      rerender({ cats: categories, newCat: 'École' })

      // Les règles doivent être les mêmes (référence identique)
      expect(result.current.validationRules).toBe(firstRules)
    })
  })
})
