/**
 * Tests pour le hook useScrollLock
 *
 * Vérifie :
 * - Lock du scroll (overflow:hidden) quand actif
 * - Restore du scroll (overflow:'') quand inactif
 * - Auto-focus sur élément spécifié
 * - Fallback sur conteneur si élément cible absent
 * - Gestion du sélecteur CSS custom
 */

import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useScrollLock } from './useScrollLock'
import { createRef } from 'react'

describe('useScrollLock', () => {
  let container: HTMLDivElement
  let footer: HTMLDivElement
  let lastButton: HTMLButtonElement

  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = ''

    // Créer structure modal avec footer
    container = document.createElement('div')
    container.className = 'modal'
    container.tabIndex = -1 // Rendre focusable

    footer = document.createElement('div')
    footer.className = 'modal__footer'

    const firstButton = document.createElement('button')
    firstButton.textContent = 'Annuler'

    lastButton = document.createElement('button')
    lastButton.textContent = 'Confirmer'

    footer.appendChild(firstButton)
    footer.appendChild(lastButton)
    container.appendChild(footer)
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    document.body.style.overflow = ''
  })

  describe('Scroll lock', () => {
    it('doit verrouiller scroll quand actif', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      renderHook(() =>
        useScrollLock({
          isActive: true,
          containerRef: ref,
        })
      )

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('ne doit pas verrouiller scroll quand inactif', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      renderHook(() =>
        useScrollLock({
          isActive: false,
          containerRef: ref,
        })
      )

      expect(document.body.style.overflow).toBe('')
    })

    it('doit verrouiller scroll au mount', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      renderHook(() =>
        useScrollLock({
          isActive: true,
          containerRef: ref,
        })
      )

      // Vérifie que le scroll est bien verrouillé
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('doit restaurer scroll quand désactivé', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      const { rerender } = renderHook(
        ({ active }) =>
          useScrollLock({
            isActive: active,
            containerRef: ref,
          }),
        {
          initialProps: { active: true },
        }
      )

      expect(document.body.style.overflow).toBe('hidden')

      // Désactiver
      rerender({ active: false })

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Auto-focus', () => {
    it('doit focus sur dernier bouton footer par défaut', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      // Mock focus
      const focusSpy = vi.spyOn(lastButton, 'focus')

      renderHook(() =>
        useScrollLock({
          isActive: true,
          containerRef: ref,
        })
      )

      expect(focusSpy).toHaveBeenCalled()
      focusSpy.mockRestore()
    })

    it('doit focus sur élément spécifié via focusSelector', () => {
      const customButton = document.createElement('button')
      customButton.className = 'primary-button'
      customButton.textContent = 'Principal'
      footer.appendChild(customButton)

      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      const focusSpy = vi.spyOn(customButton, 'focus')

      renderHook(() =>
        useScrollLock({
          isActive: true,
          containerRef: ref,
          focusSelector: '.primary-button',
        })
      )

      expect(focusSpy).toHaveBeenCalled()
      focusSpy.mockRestore()
    })

    it('doit fallback sur conteneur si élément cible absent', () => {
      const emptyContainer = document.createElement('div')
      emptyContainer.className = 'empty-modal'
      emptyContainer.tabIndex = -1
      document.body.appendChild(emptyContainer)

      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: emptyContainer,
        writable: true,
      })

      const focusSpy = vi.spyOn(emptyContainer, 'focus')

      renderHook(() =>
        useScrollLock({
          isActive: true,
          containerRef: ref,
          focusSelector: '.non-existent-button',
        })
      )

      expect(focusSpy).toHaveBeenCalled()
      focusSpy.mockRestore()

      document.body.removeChild(emptyContainer)
    })

    it('ne doit pas focus si containerRef absent', () => {
      const ref = createRef<HTMLDivElement>()
      // ref.current reste null

      // Ne doit pas crasher
      expect(() => {
        renderHook(() =>
          useScrollLock({
            isActive: true,
            containerRef: ref,
          })
        )
      }).not.toThrow()

      // Scroll lock doit quand même fonctionner
      expect(document.body.style.overflow).toBe('hidden')
    })
  })

  describe('Cas sans containerRef', () => {
    it('doit lock scroll sans containerRef', () => {
      renderHook(() =>
        useScrollLock({
          isActive: true,
          // pas de containerRef
        })
      )

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('ne doit pas crasher sans containerRef ni isActive', () => {
      expect(() => {
        renderHook(() =>
          useScrollLock({
            isActive: false,
          })
        )
      }).not.toThrow()

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Options par défaut', () => {
    it('doit utiliser focusSelector par défaut (.modal__footer button:last-of-type)', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      const focusSpy = vi.spyOn(lastButton, 'focus')

      renderHook(() =>
        useScrollLock({
          isActive: true,
          containerRef: ref,
          // focusSelector non spécifié (utilise défaut)
        })
      )

      expect(focusSpy).toHaveBeenCalled()
      focusSpy.mockRestore()
    })
  })

  describe('Transitions actif/inactif', () => {
    it('doit gérer plusieurs transitions actif → inactif → actif', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      const { rerender } = renderHook(
        ({ active }) =>
          useScrollLock({
            isActive: active,
            containerRef: ref,
          }),
        {
          initialProps: { active: true },
        }
      )

      // Actif → hidden
      expect(document.body.style.overflow).toBe('hidden')

      // Inactif → restore
      rerender({ active: false })
      expect(document.body.style.overflow).toBe('')

      // Réactif → hidden
      rerender({ active: true })
      expect(document.body.style.overflow).toBe('hidden')

      // Inactif → restore
      rerender({ active: false })
      expect(document.body.style.overflow).toBe('')
    })
  })
})
