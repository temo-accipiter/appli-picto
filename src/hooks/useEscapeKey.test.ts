/**
 * Tests pour le hook useEscapeKey
 *
 * Vérifie :
 * - Appel callback onEscape avec touche Escape
 * - Gestion Enter sur boutons dans conteneur
 * - Activation/désactivation du hook
 * - Option enableEscape pour désactiver Escape
 * - Ignorance des touches autres que Escape/Enter
 */

import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useEscapeKey } from './useEscapeKey'
import { createRef } from 'react'

describe('useEscapeKey', () => {
  let container: HTMLDivElement
  let button: HTMLButtonElement

  beforeEach(() => {
    // Créer un conteneur avec un bouton
    container = document.createElement('div')
    button = document.createElement('button')
    button.textContent = 'Confirmer'
    container.appendChild(button)
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('Gestion Escape', () => {
    it('doit appeler onEscape quand Escape est pressée', () => {
      const onEscape = vi.fn()

      renderHook(() =>
        useEscapeKey({
          isActive: true,
          onEscape,
          enableEscape: true,
        })
      )

      // Simuler Escape
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      expect(onEscape).toHaveBeenCalledTimes(1)
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('ne doit pas appeler onEscape quand inactif', () => {
      const onEscape = vi.fn()

      renderHook(() =>
        useEscapeKey({
          isActive: false,
          onEscape,
          enableEscape: true,
        })
      )

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      })

      document.dispatchEvent(event)

      expect(onEscape).not.toHaveBeenCalled()
    })

    it('ne doit pas appeler onEscape quand enableEscape=false', () => {
      const onEscape = vi.fn()

      renderHook(() =>
        useEscapeKey({
          isActive: true,
          onEscape,
          enableEscape: false,
        })
      )

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      })

      document.dispatchEvent(event)

      expect(onEscape).not.toHaveBeenCalled()
    })

    it('doit gérer onEscape undefined sans crasher', () => {
      expect(() => {
        renderHook(() =>
          useEscapeKey({
            isActive: true,
            enableEscape: true,
            // onEscape undefined
          })
        )

        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        })
        document.dispatchEvent(event)
      }).not.toThrow()
    })
  })

  describe('Gestion Enter sur boutons', () => {
    it('doit déclencher click sur bouton actif avec Enter', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', { value: container, writable: true })

      const clickSpy = vi.fn()
      button.addEventListener('click', clickSpy)

      renderHook(() =>
        useEscapeKey({
          isActive: true,
          containerRef: ref,
        })
      )

      // Focus sur bouton
      button.focus()
      expect(document.activeElement).toBe(button)

      // Simuler Enter
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
    })

    it('ne doit pas déclencher click si bouton hors conteneur', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', { value: container, writable: true })

      const outsideButton = document.createElement('button')
      outsideButton.textContent = 'Extérieur'
      document.body.appendChild(outsideButton)

      const clickSpy = vi.fn()
      outsideButton.addEventListener('click', clickSpy)

      renderHook(() =>
        useEscapeKey({
          isActive: true,
          containerRef: ref,
        })
      )

      // Focus sur bouton extérieur
      outsideButton.focus()

      // Simuler Enter
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      // Ne doit PAS empêcher ni cliquer (hors conteneur)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
      expect(clickSpy).not.toHaveBeenCalled()

      document.body.removeChild(outsideButton)
    })

    it('ne doit pas déclencher click sur input avec Enter', () => {
      const input = document.createElement('input')
      input.type = 'text'
      container.appendChild(input)

      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', { value: container, writable: true })

      renderHook(() =>
        useEscapeKey({
          isActive: true,
          containerRef: ref,
        })
      )

      input.focus()

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      // Ne doit PAS empêcher (Enter dans input = soumission form)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })

  describe('Autres touches', () => {
    it('doit ignorer les touches autres que Escape/Enter', () => {
      const onEscape = vi.fn()

      renderHook(() =>
        useEscapeKey({
          isActive: true,
          onEscape,
        })
      )

      // Tab
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      )
      expect(onEscape).not.toHaveBeenCalled()

      // Espace
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      )
      expect(onEscape).not.toHaveBeenCalled()

      // ArrowDown
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      )
      expect(onEscape).not.toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('doit retirer event listener au unmount', () => {
      const onEscape = vi.fn()
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() =>
        useEscapeKey({
          isActive: true,
          onEscape,
        })
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })

    it('doit retirer listener quand isActive devient false', () => {
      const onEscape = vi.fn()

      const { rerender } = renderHook(
        ({ active }) =>
          useEscapeKey({
            isActive: active,
            onEscape,
          }),
        {
          initialProps: { active: true },
        }
      )

      // Désactiver
      rerender({ active: false })

      // Escape ne doit plus appeler onEscape
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )

      expect(onEscape).not.toHaveBeenCalled()
    })
  })

  describe('Options par défaut', () => {
    it('doit avoir enableEscape=true par défaut', () => {
      const onEscape = vi.fn()

      renderHook(() =>
        useEscapeKey({
          isActive: true,
          onEscape,
          // enableEscape non spécifié
        })
      )

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )

      expect(onEscape).toHaveBeenCalled()
    })
  })
})
