// src/hooks/useRecompenses.test.js
/**
 * Tests pour le hook useRecompenses
 *
 * Vérifie :
 * - Chargement des récompenses de l'utilisateur
 * - Ajout de récompense
 * - Mise à jour de récompense
 * - Suppression de récompense
 * - Sélection unique de récompense
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const { mockSupabase, mockUser, mockToast } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockUser: {
    id: 'test-user-123',
  },
  mockToast: {
    show: vi.fn(),
  },
}))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/hooks', () => ({
  useAuth: () => ({ user: mockUser, authReady: true }),
  useToast: () => mockToast,
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/storage/deleteImageIfAny', () => ({
  default: vi.fn(() => Promise.resolve({ deleted: true, error: null })),
}))

vi.mock('@/utils/logs/formatErr', () => ({
  default: err => String(err?.message ?? err),
}))

describe('useRecompenses', () => {
  // Import dynamique du hook (après les mocks)
  let useRecompenses
  beforeAll(async () => {
    useRecompenses = (await import('./useRecompenses')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Chargement des récompenses', () => {
    it("doit charger les récompenses de l'utilisateur", async () => {
      // Arrange
      const mockRecompenses = [
        {
          id: '1',
          label: 'Récompense 1',
          points_requis: 10,
          selected: false,
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          label: 'Récompense 2',
          points_requis: 20,
          selected: true,
          created_at: '2025-01-02T00:00:00Z',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockRecompenses,
              error: null,
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useRecompenses())

      // Assert
      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(2)
        expect(result.current.recompenses[0].label).toBe('Récompense 1')
        expect(result.current.recompenses[1].selected).toBe(true)
        expect(result.current.loading).toBe(false)
      })
    })

    it("doit gérer l'erreur de colonne created_at manquante (fallback)", async () => {
      // Arrange
      const mockRecompenses = [
        { id: '1', label: 'Récompense 1', points_requis: 10 },
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  code: '42703',
                  message: 'column created_at does not exist',
                },
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockRecompenses,
              error: null,
            }),
          }),
        })

      // Act
      const { result } = renderHook(() => useRecompenses())

      // Assert
      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(1)
        expect(result.current.error).toBe(null)
      })
    })
  })

  describe('addRecompense', () => {
    it('doit ajouter une nouvelle récompense', async () => {
      // Arrange
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'new-1',
                  label: 'Nouvelle récompense',
                  points_requis: 15,
                  selected: false,
                },
                error: null,
              }),
            }),
          }),
        })

      // Act
      const { result } = renderHook(() => useRecompenses())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.addRecompense({
          label: 'Nouvelle récompense',
          points_requis: 15,
        })
      })

      // Assert
      expect(result.current.recompenses).toHaveLength(1)
      expect(result.current.recompenses[0].label).toBe('Nouvelle récompense')
      expect(mockToast.show).toHaveBeenCalledWith(
        'Récompense ajoutée',
        'success'
      )
    })
  })

  describe('selectRecompense', () => {
    it('doit sélectionner une seule récompense (désélectionner les autres)', async () => {
      // Arrange
      const mockRecompenses = [
        { id: '1', label: 'Récompense 1', selected: true },
        { id: '2', label: 'Récompense 2', selected: false },
        { id: '3', label: 'Récompense 3', selected: false },
      ]

      // Mock initial fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockRecompenses,
              error: null,
            }),
          }),
        }),
      })

      // Mock RPC select_recompense_atomic
      mockSupabase.rpc = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: '2', label: 'Récompense 2', selected: true },
          error: null,
        }),
      })

      // Act
      const { result } = renderHook(() => useRecompenses())

      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(3)
      })

      await act(async () => {
        await result.current.selectRecompense('2')
      })

      // Assert
      expect(result.current.recompenses[0].selected).toBe(false) // R1 désélectionnée
      expect(result.current.recompenses[1].selected).toBe(true) // R2 sélectionnée
      expect(result.current.recompenses[2].selected).toBe(false) // R3 désélectionnée
      expect(mockToast.show).toHaveBeenCalledWith(
        'Récompense sélectionnée',
        'success'
      )
    })
  })

  describe('deleteRecompense', () => {
    it('doit supprimer une récompense et son image', async () => {
      // Arrange
      const mockRecompenses = [
        { id: '1', label: 'Récompense 1', imagepath: 'images/reward1.jpg' },
        { id: '2', label: 'Récompense 2', imagepath: null },
      ]

      // Mock initial fetch
      const mockFromChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockRecompenses,
              error: null,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      }

      mockSupabase.from.mockReturnValue(mockFromChain)

      // Act
      const { result } = renderHook(() => useRecompenses())

      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(2)
      })

      await act(async () => {
        await result.current.deleteRecompense(mockRecompenses[0])
      })

      // Assert
      expect(result.current.recompenses).toHaveLength(1)
      expect(result.current.recompenses[0].id).toBe('2')
      expect(mockToast.show).toHaveBeenCalledWith(
        'Récompense supprimée',
        'success'
      )
    })
  })

  describe('updateRecompense', () => {
    it('doit mettre à jour une récompense', async () => {
      // Arrange
      const mockRecompenses = [
        { id: '1', label: 'Récompense 1', points_requis: 10 },
      ]

      // Mock chain for both select and update
      const mockFromChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockRecompenses,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: '1',
                    label: 'Récompense Modifiée',
                    points_requis: 20,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }

      mockSupabase.from.mockReturnValue(mockFromChain)

      // Act
      const { result } = renderHook(() => useRecompenses())

      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(1)
      })

      await act(async () => {
        await result.current.updateRecompense('1', {
          label: 'Récompense Modifiée',
          points_requis: 20,
        })
      })

      // Assert
      expect(result.current.recompenses[0].label).toBe('Récompense Modifiée')
      expect(result.current.recompenses[0].points_requis).toBe(20)
      expect(mockToast.show).toHaveBeenCalledWith(
        'Récompense modifiée',
        'success'
      )
    })
  })
})
