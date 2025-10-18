// src/hooks/useAccountStatus.test.js
/**
 * Tests pour le hook useAccountStatus
 *
 * Vérifie :
 * - Chargement du statut du compte
 * - Gestion des différents états (active, suspended, deletion_scheduled, pending_verification)
 * - Flags booléens (isSuspended, isPendingVerification, isScheduledForDeletion)
 * - Permissions (canUseApp, canCreateContent)
 * - Changement de statut (changeAccountStatus)
 * - Annulation de suppression (cancelDeletion)
 * - Programmation de suppression (scheduleDeletion)
 * - Gestion des erreurs et abort-safe
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const { mockSupabase, mockUser, mockWithAbortSafe, mockIsAbortLike } =
  vi.hoisted(() => ({
    mockSupabase: {
      from: vi.fn(),
      channel: vi.fn(),
      removeChannel: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
    },
    mockUser: {
      id: 'test-user-123',
    },
    mockWithAbortSafe: vi.fn(),
    mockIsAbortLike: vi.fn(() => false),
  }))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/hooks', () => ({
  useAuth: () => ({ user: mockUser }),
  withAbortSafe: mockWithAbortSafe,
  isAbortLike: mockIsAbortLike,
}))

vi.mock('@/hooks/useAuth', () => ({
  default: () => ({ user: mockUser }),
}))

describe('useAccountStatus', () => {
  // Import dynamique du hook (après les mocks)
  let useAccountStatus
  beforeAll(async () => {
    useAccountStatus = (await import('./useAccountStatus')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAbortLike.mockReturnValue(false)

    // Mock channel subscription par défaut
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }
    mockSupabase.channel.mockReturnValue(mockChannel)
  })

  describe('Chargement du statut', () => {
    it('doit charger le statut "active" par défaut', async () => {
      // Arrange
      const mockProfile = {
        account_status: 'active',
        deletion_scheduled_at: null,
      }

      mockWithAbortSafe.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.accountStatus).toBe('active')
        expect(result.current.loading).toBe(false)
        expect(result.current.isSuspended).toBe(false)
        expect(result.current.isPendingVerification).toBe(false)
        expect(result.current.isScheduledForDeletion).toBe(false)
        expect(result.current.canUseApp).toBe(true)
        expect(result.current.canCreateContent).toBe(true)
      })
    })

    it('doit détecter un compte suspendu', async () => {
      // Arrange
      const mockProfile = {
        account_status: 'suspended',
        deletion_scheduled_at: null,
      }

      mockWithAbortSafe.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.accountStatus).toBe('suspended')
        expect(result.current.isSuspended).toBe(true)
        expect(result.current.canUseApp).toBe(false)
        expect(result.current.canCreateContent).toBe(false)
      })
    })

    it('doit détecter un compte en attente de vérification', async () => {
      // Arrange
      const mockProfile = {
        account_status: 'pending_verification',
        deletion_scheduled_at: null,
      }

      mockWithAbortSafe.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.accountStatus).toBe('pending_verification')
        expect(result.current.isPendingVerification).toBe(true)
        expect(result.current.canUseApp).toBe(true) // Peut utiliser en mode lecture
        expect(result.current.canCreateContent).toBe(false) // Ne peut pas créer
      })
    })

    it('doit détecter un compte programmé pour suppression', async () => {
      // Arrange
      const deletionDate = '2025-12-31T23:59:59Z'
      const mockProfile = {
        account_status: 'deletion_scheduled',
        deletion_scheduled_at: deletionDate,
      }

      mockWithAbortSafe.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.accountStatus).toBe('deletion_scheduled')
        expect(result.current.isScheduledForDeletion).toBe(true)
        expect(result.current.deletionDate).toBe(deletionDate)
        expect(result.current.canUseApp).toBe(false)
        expect(result.current.canCreateContent).toBe(false)
      })
    })

    it('doit fallback à "active" en cas d\'erreur', async () => {
      // Arrange
      const mockError = { message: 'Network error', code: 'PGRST301' }

      mockWithAbortSafe.mockResolvedValue({
        data: null,
        error: mockError,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.accountStatus).toBe('active') // Fallback
        expect(result.current.loading).toBe(false)
      })
    })

    it('doit gérer les requêtes aborted sans erreur', async () => {
      // Arrange
      const abortError = { message: 'aborted', code: '20' }
      mockIsAbortLike.mockReturnValue(true)

      mockWithAbortSafe.mockResolvedValue({
        data: null,
        error: abortError,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.accountStatus).toBe(null)
      })
    })
  })

  describe('statusDisplay', () => {
    it("doit retourner les bonnes infos d'affichage pour chaque statut", async () => {
      // Arrange
      const mockProfile = {
        account_status: 'active',
        deletion_scheduled_at: null,
      }

      mockWithAbortSafe.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.statusDisplay).toMatchObject({
          label: 'Actif',
          color: 'success',
          icon: '✅',
        })
      })
    })
  })

  describe('changeAccountStatus', () => {
    it('doit changer le statut du compte via edge function', async () => {
      // Arrange
      const mockProfile = {
        account_status: 'active',
        deletion_scheduled_at: null,
      }

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockProfile,
          error: null,
        })
        // Mock refresh après changement
        .mockResolvedValueOnce({
          data: { account_status: 'suspended', deletion_scheduled_at: null },
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.accountStatus).toBe('active')
      })

      let success
      await act(async () => {
        success = await result.current.changeAccountStatus(
          'suspended',
          'Test reason'
        )
      })

      // Assert
      expect(success).toBe(true)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'change-account-status',
        {
          body: {
            target_user_id: 'test-user-123',
            new_status: 'suspended',
            reason: 'Test reason',
          },
        }
      )
      await waitFor(() => {
        expect(result.current.accountStatus).toBe('suspended')
      })
    })

    it('doit gérer les erreurs de changement de statut', async () => {
      // Arrange
      const mockProfile = {
        account_status: 'active',
        deletion_scheduled_at: null,
      }

      mockWithAbortSafe.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized' },
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.accountStatus).toBe('active')
      })

      let success
      await act(async () => {
        success = await result.current.changeAccountStatus('suspended')
      })

      // Assert
      expect(success).toBe(false)
    })
  })

  describe('cancelDeletion', () => {
    it('doit annuler la suppression programmée', async () => {
      // Arrange
      const mockProfile = {
        account_status: 'deletion_scheduled',
        deletion_scheduled_at: '2025-12-31T23:59:59Z',
      }

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockProfile,
          error: null,
        })
        // Mock refresh après annulation
        .mockResolvedValueOnce({
          data: { account_status: 'active', deletion_scheduled_at: null },
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.isScheduledForDeletion).toBe(true)
      })

      let success
      await act(async () => {
        success = await result.current.cancelDeletion()
      })

      // Assert
      expect(success).toBe(true)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'change-account-status',
        expect.objectContaining({
          body: expect.objectContaining({
            new_status: 'active',
            reason: "Suppression annulée par l'utilisateur",
          }),
        })
      )
    })
  })

  describe('scheduleDeletion', () => {
    it('doit programmer la suppression du compte', async () => {
      // Arrange
      const mockProfile = {
        account_status: 'active',
        deletion_scheduled_at: null,
      }

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockProfile,
          error: null,
        })
        // Mock refresh après programmation
        .mockResolvedValueOnce({
          data: {
            account_status: 'deletion_scheduled',
            deletion_scheduled_at: '2025-12-31T23:59:59Z',
          },
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.accountStatus).toBe('active')
      })

      let success
      await act(async () => {
        success = await result.current.scheduleDeletion()
      })

      // Assert
      expect(success).toBe(true)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'change-account-status',
        expect.objectContaining({
          body: expect.objectContaining({
            new_status: 'deletion_scheduled',
            reason: "Suppression programmée par l'utilisateur",
          }),
        })
      )
    })
  })

  describe('refresh', () => {
    it('doit recharger manuellement le statut', async () => {
      // Arrange
      const mockProfile1 = {
        account_status: 'active',
        deletion_scheduled_at: null,
      }
      const mockProfile2 = {
        account_status: 'pending_verification',
        deletion_scheduled_at: null,
      }

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockProfile1,
          error: null,
        })
        // Mock refresh
        .mockResolvedValueOnce({
          data: mockProfile2,
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.accountStatus).toBe('active')
      })

      await act(async () => {
        await result.current.refresh()
      })

      // Assert
      await waitFor(() => {
        expect(result.current.accountStatus).toBe('pending_verification')
      })
    })
  })
})
