// src/contexts/ToastContext.test.jsx
/**
 * Tests simplifiés pour ToastContext
 *
 * Vérifie :
 * - Fonctions show() et hide() sont disponibles dans le contexte
 * - Appels aux fonctions fonctionnent sans erreur
 * - Provider rend correctement les enfants
 */

import { render, screen, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ToastProvider, useToast } from './ToastContext'

// Composant de test simple
function TestConsumer() {
  const toast = useToast()
  return (
    <div>
      <div data-testid="has-show">{toast && toast.show ? 'yes' : 'no'}</div>
      <div data-testid="has-hide">{toast && toast.hide ? 'yes' : 'no'}</div>
      <button
        data-testid="call-show"
        onClick={() => toast?.show?.('Test message', 'info')}
      >
        Show Toast
      </button>
      <button data-testid="call-hide" onClick={() => toast?.hide?.()}>
        Hide Toast
      </button>
    </div>
  )
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Provider', () => {
    it('doit fournir les fonctions show et hide', () => {
      // Act
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      )

      // Assert
      expect(screen.getByTestId('has-show').textContent).toBe('yes')
      expect(screen.getByTestId('has-hide').textContent).toBe('yes')
    })

    it('doit rendre les enfants correctement', () => {
      // Act
      render(
        <ToastProvider>
          <div data-testid="child">Test Child</div>
        </ToastProvider>
      )

      // Assert
      expect(screen.getByTestId('child')).toBeInTheDocument()
      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })
  })

  describe('Fonctions show() et hide()', () => {
    it('doit appeler show() sans erreur', () => {
      // Act
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      )

      const showBtn = screen.getByTestId('call-show')

      // Assert - ne devrait pas throw
      expect(() => {
        act(() => {
          showBtn.click()
        })
      }).not.toThrow()
    })

    it('doit appeler hide() sans erreur', () => {
      // Act
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      )

      const showBtn = screen.getByTestId('call-show')
      const hideBtn = screen.getByTestId('call-hide')

      // Show first
      act(() => {
        showBtn.click()
      })

      // Assert - hide ne devrait pas throw
      expect(() => {
        act(() => {
          hideBtn.click()
        })
      }).not.toThrow()
    })

    it('doit appeler show() avec différents types sans erreur', () => {
      // Arrange
      function TypeTestConsumer() {
        const { show } = useToast()
        return (
          <div>
            <button
              data-testid="show-info"
              onClick={() => show('Info', 'info')}
            >
              Info
            </button>
            <button
              data-testid="show-success"
              onClick={() => show('Success', 'success')}
            >
              Success
            </button>
            <button
              data-testid="show-error"
              onClick={() => show('Error', 'error')}
            >
              Error
            </button>
            <button
              data-testid="show-warning"
              onClick={() => show('Warning', 'warning')}
            >
              Warning
            </button>
          </div>
        )
      }

      // Act
      render(
        <ToastProvider>
          <TypeTestConsumer />
        </ToastProvider>
      )

      // Assert - tous les types devraient fonctionner
      expect(() => {
        act(() => {
          screen.getByTestId('show-info').click()
        })
      }).not.toThrow()

      expect(() => {
        act(() => {
          screen.getByTestId('show-success').click()
        })
      }).not.toThrow()

      expect(() => {
        act(() => {
          screen.getByTestId('show-error').click()
        })
      }).not.toThrow()

      expect(() => {
        act(() => {
          screen.getByTestId('show-warning').click()
        })
      }).not.toThrow()
    })

    it('doit appeler show() avec options personnalisées sans erreur', () => {
      // Arrange
      function OptionsTestConsumer() {
        const { show } = useToast()
        return (
          <button
            data-testid="show-custom"
            onClick={() => show('Custom', 'info', { duration: 3000 })}
          >
            Show Custom
          </button>
        )
      }

      // Act
      render(
        <ToastProvider>
          <OptionsTestConsumer />
        </ToastProvider>
      )

      // Assert
      expect(() => {
        act(() => {
          screen.getByTestId('show-custom').click()
        })
      }).not.toThrow()
    })
  })

  describe('Durée par défaut personnalisée', () => {
    it('doit accepter une durée par défaut personnalisée', () => {
      // Act & Assert - ne devrait pas throw
      expect(() => {
        render(
          <ToastProvider defaultDuration={3000}>
            <TestConsumer />
          </ToastProvider>
        )
      }).not.toThrow()

      expect(screen.getByTestId('has-show').textContent).toBe('yes')
    })
  })

  describe('useToast hook', () => {
    it('doit retourner null si utilisé hors du Provider', () => {
      // Arrange
      function OutsideConsumer() {
        const toast = useToast()
        return (
          <div data-testid="toast-value">{toast ? 'not-null' : 'null'}</div>
        )
      }

      // Act
      render(<OutsideConsumer />)

      // Assert
      expect(screen.getByTestId('toast-value').textContent).toBe('null')
    })
  })
})
