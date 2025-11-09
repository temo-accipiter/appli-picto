// src/hooks/useTaches.test.js
/**
 * Tests pour le hook useTaches
 *
 * Vérifie :
 * - Chargement des tâches de l'utilisateur
 * - Toggle fait/non-fait
 * - Reset de toutes les tâches
 * - Mise à jour des positions (drag & drop)
 * - Suppression de tâche
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

describe('useTaches', () => {
  // Import dynamique du hook (après les mocks)
  let useTaches
  beforeAll(async () => {
    useTaches = (await import('./useTaches')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Chargement des tâches', () => {
    it("doit charger les tâches de l'utilisateur connecté", async () => {
      // Arrange
      const mockTaches = [
        {
          id: '1',
          label: 'Tâche 1',
          fait: false,
          aujourdhui: true,
          position: 0,
        },
        {
          id: '2',
          label: 'Tâche 2',
          fait: true,
          aujourdhui: false,
          position: 1,
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTaches,
              error: null,
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useTaches())

      // Assert
      await waitFor(() => {
        expect(result.current.taches).toHaveLength(2)
        expect(result.current.taches[0].label).toBe('Tâche 1')
        expect(result.current.taches[0].fait).toBe(false)
        expect(result.current.taches[0].aujourdhui).toBe(true)
      })
    })

    it('doit normaliser les booléens fait et aujourdhui', async () => {
      // Arrange - Supabase peut retourner truthy/falsy au lieu de vrais booléens
      const mockTaches = [
        { id: '1', label: 'Tâche 1', fait: 1, aujourdhui: 0, position: 0 },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTaches,
              error: null,
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useTaches())

      // Assert
      await waitFor(() => {
        expect(result.current.taches[0].fait).toBe(true) // 1 → true
        expect(result.current.taches[0].aujourdhui).toBe(false) // 0 → false
      })
    })

    it('doit gérer les erreurs de chargement', async () => {
      // Arrange
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network error', code: 'PGRST301' },
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useTaches())

      // Assert
      await waitFor(() => {
        expect(result.current.taches).toEqual([])
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('❌ Erreur fetch taches')
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('toggleFait', () => {
    it("doit inverser l'état fait d'une tâche", async () => {
      // Arrange
      const mockTaches = [
        {
          id: '1',
          label: 'Tâche 1',
          fait: false,
          aujourdhui: true,
          position: 0,
        },
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockTaches,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        })

      // Act
      const { result } = renderHook(() => useTaches())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(1)
      })

      await act(async () => {
        await result.current.toggleFait('1', false)
      })

      // Assert
      expect(result.current.taches[0].fait).toBe(true)
    })
  })

  describe('resetFait', () => {
    it('doit remettre toutes les tâches à non-fait', async () => {
      // Arrange
      const mockTaches = [
        {
          id: '1',
          label: 'Tâche 1',
          fait: true,
          aujourdhui: true,
          position: 0,
        },
        {
          id: '2',
          label: 'Tâche 2',
          fait: true,
          aujourdhui: false,
          position: 1,
        },
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockTaches,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        })

      // Act
      const { result } = renderHook(() => useTaches())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(2)
      })

      await act(async () => {
        await result.current.resetFait()
      })

      // Assert
      expect(result.current.taches[0].fait).toBe(false)
      expect(result.current.taches[1].fait).toBe(false)
      expect(mockToast.show).toHaveBeenCalledWith(
        'Toutes les tâches ont été réinitialisées',
        'success'
      )
    })
  })

  describe('updatePosition', () => {
    it("doit mettre à jour l'ordre des tâches après drag & drop", async () => {
      // Arrange
      const mockTaches = [
        { id: '1', label: 'Tâche 1', position: 0 },
        { id: '2', label: 'Tâche 2', position: 1 },
        { id: '3', label: 'Tâche 3', position: 2 },
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockTaches,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        })

      // Act
      const { result } = renderHook(() => useTaches())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(3)
      })

      // Inverser l'ordre : [3, 2, 1]
      const reordered = [mockTaches[2], mockTaches[1], mockTaches[0]]

      await act(async () => {
        result.current.updatePosition(reordered)
      })

      // Assert
      expect(result.current.taches[0].id).toBe('3')
      expect(result.current.taches[1].id).toBe('2')
      expect(result.current.taches[2].id).toBe('1')
    })
  })

  describe('deleteTache', () => {
    it('doit supprimer une tâche et son image', async () => {
      // Arrange
      const mockTaches = [
        {
          id: '1',
          label: 'Tâche 1',
          imagepath: 'images/task1.jpg',
          position: 0,
        },
        { id: '2', label: 'Tâche 2', imagepath: null, position: 1 },
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockTaches,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        })

      // Act
      const { result } = renderHook(() => useTaches())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(2)
      })

      await act(async () => {
        await result.current.deleteTache(mockTaches[0])
      })

      // Assert
      expect(result.current.taches).toHaveLength(1)
      expect(result.current.taches[0].id).toBe('2')
      expect(mockToast.show).toHaveBeenCalledWith('Tâche supprimée', 'success')
    })
  })
})
