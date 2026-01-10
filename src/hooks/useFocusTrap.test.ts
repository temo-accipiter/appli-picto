/**
 * Tests pour le hook useFocusTrap
 *
 * Vérifie :
 * - Piège focus avec Tab (dernier → premier)
 * - Piège focus avec Shift+Tab (premier → dernier)
 * - Activation/désactivation du hook
 * - Sélection correcte des éléments focusables
 * - Ignorance des touches autres que Tab
 */

import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useFocusTrap } from './useFocusTrap'
import { createRef } from 'react'

describe('useFocusTrap', () => {
  let container: HTMLDivElement
  let firstButton: HTMLButtonElement
  let lastButton: HTMLButtonElement

  beforeEach(() => {
    // Créer un conteneur avec plusieurs éléments focusables
    container = document.createElement('div')
    firstButton = document.createElement('button')
    firstButton.textContent = 'Premier'

    const middleButton = document.createElement('button')
    middleButton.textContent = 'Milieu'

    lastButton = document.createElement('button')
    lastButton.textContent = 'Dernier'

    container.appendChild(firstButton)
    container.appendChild(middleButton)
    container.appendChild(lastButton)
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('Focus trap actif', () => {
    it('doit rediriger focus du dernier vers premier avec Tab', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      renderHook(() => useFocusTrap(ref, true))

      // Simuler focus sur dernier bouton
      lastButton.focus()
      expect(document.activeElement).toBe(lastButton)

      // Simuler Tab
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      // preventDefault doit être appelé
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('doit rediriger focus du premier vers dernier avec Shift+Tab', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      renderHook(() => useFocusTrap(ref, true))

      // Simuler focus sur premier bouton
      firstButton.focus()
      expect(document.activeElement).toBe(firstButton)

      // Simuler Shift+Tab
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      // preventDefault doit être appelé
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('ne doit pas intercepter Tab sur élément du milieu', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      renderHook(() => useFocusTrap(ref, true))

      // Focus sur bouton du milieu
      const middleButton = container.querySelectorAll(
        'button'
      )[1] as HTMLButtonElement
      middleButton.focus()

      // Simuler Tab
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      // preventDefault NE doit PAS être appelé (navigation normale)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('doit ignorer les touches autres que Tab', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      renderHook(() => useFocusTrap(ref, true))

      lastButton.focus()

      // Simuler Enter
      const eventEnter = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpyEnter = vi.spyOn(eventEnter, 'preventDefault')
      document.dispatchEvent(eventEnter)
      expect(preventDefaultSpyEnter).not.toHaveBeenCalled()

      // Simuler Escape
      const eventEscape = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpyEscape = vi.spyOn(eventEscape, 'preventDefault')
      document.dispatchEvent(eventEscape)
      expect(preventDefaultSpyEscape).not.toHaveBeenCalled()
    })
  })

  describe('Focus trap inactif', () => {
    it('ne doit pas intercepter Tab quand inactif', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      renderHook(() => useFocusTrap(ref, false))

      lastButton.focus()

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      // preventDefault NE doit PAS être appelé (focus trap désactivé)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })

  describe('Cas limites', () => {
    it('doit gérer conteneur sans éléments focusables', () => {
      const emptyContainer = document.createElement('div')
      emptyContainer.innerHTML = '<p>Pas de boutons</p>'
      document.body.appendChild(emptyContainer)

      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: emptyContainer,
        writable: true,
      })

      // Ne doit pas crasher
      expect(() => {
        renderHook(() => useFocusTrap(ref, true))
      }).not.toThrow()

      document.body.removeChild(emptyContainer)
    })

    it('doit gérer conteneur null', () => {
      const ref = createRef<HTMLDivElement>()
      // ref.current reste null

      // Ne doit pas crasher
      expect(() => {
        renderHook(() => useFocusTrap(ref, true))
      }).not.toThrow()
    })

    it('doit gérer un seul élément focusable', () => {
      const singleContainer = document.createElement('div')
      const singleButton = document.createElement('button')
      singleButton.textContent = 'Seul'
      singleContainer.appendChild(singleButton)
      document.body.appendChild(singleContainer)

      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: singleContainer,
        writable: true,
      })

      renderHook(() => useFocusTrap(ref, true))

      singleButton.focus()

      // Tab doit cycler sur le même bouton
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      // preventDefault doit être appelé (cycle sur lui-même)
      expect(preventDefaultSpy).toHaveBeenCalled()

      document.body.removeChild(singleContainer)
    })
  })

  describe('Cleanup', () => {
    it('doit retirer event listener au unmount', () => {
      const ref = createRef<HTMLDivElement>()
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      })

      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useFocusTrap(ref, true))

      unmount()

      // Vérifier que removeEventListener a été appelé
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })
})
