/**
 * Tests unitaires — useEditionState
 *
 * Couvre :
 * - État initial (drafts vide, errors vide, successIds vide)
 * - handleChange : met à jour le draft + vide l'erreur existante
 * - validateLabel : cas valide / vide / espaces bordure / doubles espaces
 * - clearDraft / clearError : supprime l'entrée ciblée sans affecter les autres
 * - setError : ajoute une erreur
 * - triggerSuccess : ajoute l'id puis le retire après le timeout
 * - triggerSuccess parallèles : deux ids se retirent indépendamment
 */

import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditionState } from './useEditionState'

const ERROR_MSG = 'Nom invalide'

describe('useEditionState', () => {
  describe('État initial', () => {
    it('retourne drafts, errors et successIds vides', () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      expect(result.current.drafts).toEqual({})
      expect(result.current.errors).toEqual({})
      expect(result.current.successIds.size).toBe(0)
    })
  })

  describe('handleChange', () => {
    it('met à jour drafts[id] avec la nouvelle valeur', () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      act(() => {
        result.current.handleChange('abc', 'nouveau label')
      })

      expect(result.current.drafts['abc']).toBe('nouveau label')
    })

    it('vide errors[id] quand on modifie le draft', () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      // Positionner une erreur existante
      act(() => {
        result.current.setError('abc', ERROR_MSG)
      })
      expect(result.current.errors['abc']).toBe(ERROR_MSG)

      // handleChange doit la vider
      act(() => {
        result.current.handleChange('abc', 'valeur en cours')
      })

      expect(result.current.errors['abc']).toBe('')
    })

    it("n'affecte pas les autres ids", () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      act(() => {
        result.current.setError('autre', 'erreur autre')
        result.current.handleChange('abc', 'valeur')
      })

      expect(result.current.errors['autre']).toBe('erreur autre')
    })
  })

  describe('validateLabel', () => {
    it("retourne '' pour un label valide", () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      expect(result.current.validateLabel('Tâche valide')).toBe('')
      expect(result.current.validateLabel('A')).toBe('')
    })

    it('retourne le message pour un label vide', () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      expect(result.current.validateLabel('')).toBe(ERROR_MSG)
      expect(result.current.validateLabel('   ')).toBe(ERROR_MSG)
    })

    it("retourne le message pour un label avec espace en début", () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      expect(result.current.validateLabel(' label')).toBe(ERROR_MSG)
    })

    it("retourne le message pour un label avec espace en fin", () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      expect(result.current.validateLabel('label ')).toBe(ERROR_MSG)
    })

    it('retourne le message pour un label avec doubles espaces internes', () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      expect(result.current.validateLabel('label  doublon')).toBe(ERROR_MSG)
      expect(result.current.validateLabel('a   b')).toBe(ERROR_MSG)
    })

    it('utilise le validationErrorMessage fourni', () => {
      const customMsg = 'Nom de récompense invalide'
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: customMsg })
      )

      expect(result.current.validateLabel('')).toBe(customMsg)
    })
  })

  describe('clearDraft', () => {
    it('supprime drafts[id] sans affecter les autres', () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      act(() => {
        result.current.handleChange('a', 'valeur A')
        result.current.handleChange('b', 'valeur B')
      })

      act(() => {
        result.current.clearDraft('a')
      })

      expect(result.current.drafts['a']).toBeUndefined()
      expect(result.current.drafts['b']).toBe('valeur B')
    })
  })

  describe('clearError', () => {
    it("supprime errors[id] sans affecter les autres", () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      act(() => {
        result.current.setError('a', 'erreur A')
        result.current.setError('b', 'erreur B')
      })

      act(() => {
        result.current.clearError('a')
      })

      expect(result.current.errors['a']).toBeUndefined()
      expect(result.current.errors['b']).toBe('erreur B')
    })
  })

  describe('setError', () => {
    it('ajoute errors[id] avec le message', () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      act(() => {
        result.current.setError('xyz', 'message erreur')
      })

      expect(result.current.errors['xyz']).toBe('message erreur')
    })

    it("n'efface pas les erreurs existantes des autres ids", () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      act(() => {
        result.current.setError('a', 'erreur A')
        result.current.setError('b', 'erreur B')
      })

      expect(result.current.errors['a']).toBe('erreur A')
      expect(result.current.errors['b']).toBe('erreur B')
    })
  })

  describe('triggerSuccess', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("ajoute l'id à successIds immédiatement", () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      act(() => {
        result.current.triggerSuccess('item-1')
      })

      expect(result.current.successIds.has('item-1')).toBe(true)
    })

    it("retire l'id après la durée par défaut (600ms)", () => {
      const { result } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      act(() => {
        result.current.triggerSuccess('item-1')
      })

      expect(result.current.successIds.has('item-1')).toBe(true)

      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(result.current.successIds.has('item-1')).toBe(false)
    })

    it('retire après la durée personnalisée', () => {
      const { result } = renderHook(() =>
        useEditionState({
          validationErrorMessage: ERROR_MSG,
          successDuration: 1000,
        })
      )

      act(() => {
        result.current.triggerSuccess('item-1')
      })

      // Avant la durée : toujours présent
      act(() => {
        vi.advanceTimersByTime(999)
      })
      expect(result.current.successIds.has('item-1')).toBe(true)

      // Après la durée : retiré
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current.successIds.has('item-1')).toBe(false)
    })

    it('gère deux ids en parallèle — chacun se retire indépendamment', () => {
      const { result } = renderHook(() =>
        useEditionState({
          validationErrorMessage: ERROR_MSG,
          successDuration: 600,
        })
      )

      act(() => {
        result.current.triggerSuccess('item-1')
      })

      // item-2 déclenché 200ms plus tard
      act(() => {
        vi.advanceTimersByTime(200)
        result.current.triggerSuccess('item-2')
      })

      expect(result.current.successIds.has('item-1')).toBe(true)
      expect(result.current.successIds.has('item-2')).toBe(true)

      // À t=600 : item-1 retiré, item-2 encore présent
      act(() => {
        vi.advanceTimersByTime(400) // 200 + 400 = 600ms depuis item-1
      })

      expect(result.current.successIds.has('item-1')).toBe(false)
      expect(result.current.successIds.has('item-2')).toBe(true)

      // À t=800 : item-2 retiré à son tour (200 + 600ms)
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.successIds.has('item-2')).toBe(false)
    })
  })

  describe('Stabilité des références (useCallback)', () => {
    it('handleChange reste stable entre les rendus', () => {
      const { result, rerender } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      const ref = result.current.handleChange
      rerender()

      expect(result.current.handleChange).toBe(ref)
    })

    it('clearDraft reste stable entre les rendus', () => {
      const { result, rerender } = renderHook(() =>
        useEditionState({ validationErrorMessage: ERROR_MSG })
      )

      const ref = result.current.clearDraft
      rerender()

      expect(result.current.clearDraft).toBe(ref)
    })

    it('triggerSuccess reste stable si successDuration ne change pas', () => {
      const { result, rerender } = renderHook(
        ({ duration }) =>
          useEditionState({
            validationErrorMessage: ERROR_MSG,
            successDuration: duration,
          }),
        { initialProps: { duration: 600 } }
      )

      const ref = result.current.triggerSuccess
      rerender({ duration: 600 })

      expect(result.current.triggerSuccess).toBe(ref)
    })
  })
})
