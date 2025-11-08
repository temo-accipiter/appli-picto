// src/contexts/AuthContext.test.tsx
/**
 * Tests simplifiés pour AuthContext
 *
 * Vérifie :
 * - Initialisation avec session existante
 * - Initialisation sans session (visiteur)
 * - Fonction signOut
 * - Gestion des erreurs
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthContext, AuthProvider } from './AuthContext'
import { useContext } from 'react'
import type { User } from '@supabase/supabase-js'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

// Composant de test pour lire le contexte
function TestConsumer() {
  const { user, authReady, error, signOut } = useContext(AuthContext)
  return (
    <div>
      <div data-testid="user">{user ? user.id : 'null'}</div>
      <div data-testid="authReady">{authReady ? 'true' : 'false'}</div>
      <div data-testid="error">{error ? error.message : 'null'}</div>
      <button onClick={signOut} data-testid="signOutBtn">
        Sign Out
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    unsubscribeMock = vi.fn()
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    })
  })

  describe('Initialisation', () => {
    it('doit initialiser avec une session existante', async () => {
      // Arrange
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: mockUser,
          },
        },
        error: null,
      })

      // Act
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      // Assert - user devrait être défini et authReady true
      await waitFor(
        () => {
          expect(screen.getByTestId('user').textContent).toBe('user-123')
          expect(screen.getByTestId('authReady').textContent).toBe('true')
        },
        { timeout: 3000 }
      )
    })

    it('doit initialiser sans session (visiteur)', async () => {
      // Arrange
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: null,
        },
        error: null,
      })

      // Act
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      // Assert - user devrait être null, authReady devient true après timeout
      await waitFor(
        () => {
          expect(screen.getByTestId('user').textContent).toBe('null')
          expect(screen.getByTestId('authReady').textContent).toBe('true')
        },
        { timeout: 2000 }
      )
    })

    it('doit gérer les erreurs de getSession avec fallback authReady', async () => {
      // Arrange
      const mockError = new Error('Session error')
      mockSupabase.auth.getSession.mockRejectedValue(mockError)

      // Act
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      // Assert - authReady devrait passer à true malgré l'erreur
      await waitFor(
        () => {
          expect(screen.getByTestId('authReady').textContent).toBe('true')
        },
        { timeout: 2000 }
      )
    })
  })

  describe('signOut', () => {
    it("doit déconnecter l'utilisateur", async () => {
      // Arrange
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: mockUser,
          },
        },
        error: null,
      })

      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      })

      // Act
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(
        () => {
          expect(screen.getByTestId('user').textContent).toBe('user-123')
        },
        { timeout: 2000 }
      )

      const signOutBtn = screen.getByTestId('signOutBtn')

      await act(async () => {
        signOutBtn.click()
      })

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null')
      })
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('doit gérer les erreurs de signOut', async () => {
      // Arrange
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: mockUser,
          },
        },
        error: null,
      })

      const signOutError = new Error('SignOut failed')
      mockSupabase.auth.signOut.mockRejectedValue(signOutError)

      // Act
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(
        () => {
          expect(screen.getByTestId('user').textContent).toBe('user-123')
        },
        { timeout: 2000 }
      )

      const signOutBtn = screen.getByTestId('signOutBtn')

      await act(async () => {
        signOutBtn.click()
      })

      // Assert - user devrait être null malgré l'erreur
      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null')
        expect(screen.getByTestId('error').textContent).toBe('SignOut failed')
      })
    })
  })

  describe('Cleanup', () => {
    it("doit s'initialiser correctement et cleanup sans erreur", async () => {
      // Arrange
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      // Act
      const { unmount } = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      // Attendre l'initialisation
      await waitFor(
        () => {
          expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
        },
        { timeout: 1000 }
      )

      // Unmount - devrait cleanup sans erreur
      expect(() => unmount()).not.toThrow()

      // Vérifier que onAuthStateChange a été appelé
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1)
    })
  })
})
