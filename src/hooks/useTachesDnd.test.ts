// src/hooks/useTachesDnd.test.js
/**
 * Tests pour le hook useTachesDnd
 *
 * Vérifie :
 * - Chargement des tâches "aujourdhui"
 * - Toggle done/undone
 * - Reset all tasks
 * - Drag & drop (moveTask)
 * - Sauvegarde de l'ordre (saveOrder)
 * - Gestion retry logic
 * - Gestion abort-safe
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const {
  mockSupabase,
  mockUser,
  mockWithAbortSafe,
  mockIsAbortLike,
  mockToast,
} = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockUser: {
    id: 'test-user-123',
  },
  mockWithAbortSafe: vi.fn(),
  mockIsAbortLike: vi.fn(() => false),
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
  withAbortSafe: mockWithAbortSafe,
  isAbortLike: mockIsAbortLike,
}))

describe('useTachesDnd', () => {
  // Import dynamique du hook (après les mocks)
  let useTachesDnd
  beforeAll(async () => {
    useTachesDnd = (await import('./useTachesDnd')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAbortLike.mockReturnValue(false)
  })

  describe('Chargement des tâches', () => {
    it('doit charger les tâches "aujourdhui" de l\'utilisateur', async () => {
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
          aujourdhui: true,
          position: 1,
        },
      ]

      mockWithAbortSafe.mockResolvedValue({
        data: mockTaches,
        error: null,
        aborted: false,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(),
            }),
          }),
        }),
      })

      const mockOnChange = vi.fn()

      // Act
      const { result } = renderHook(() => useTachesDnd(mockOnChange))

      // Assert
      await waitFor(() => {
        expect(result.current.taches).toHaveLength(2)
        expect(result.current.taches[0].label).toBe('Tâche 1')
        expect(result.current.doneMap['1']).toBe(false)
        expect(result.current.doneMap['2']).toBe(true)
        expect(mockOnChange).toHaveBeenCalledWith(1, 2) // 1 done, 2 total
      })
    })

    it('doit gérer les requêtes aborted sans erreur', async () => {
      // Arrange
      mockWithAbortSafe.mockResolvedValue({
        data: null,
        error: null,
        aborted: true, // ✅ Abort
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(),
            }),
          }),
        }),
      })

      const mockOnChange = vi.fn()

      // Act
      const { result } = renderHook(() => useTachesDnd(mockOnChange))

      // Assert - Ne doit pas planter, juste ignorer
      await waitFor(() => {
        expect(result.current.taches).toEqual([])
        expect(mockOnChange).not.toHaveBeenCalled()
      })
    })

    it('doit gérer les erreurs abort-like sans crash', async () => {
      // Arrange
      const abortError = { message: 'aborted', code: '20' }
      mockIsAbortLike.mockReturnValue(true)

      mockWithAbortSafe.mockResolvedValue({
        data: null,
        error: abortError,
        aborted: false,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(),
            }),
          }),
        }),
      })

      const mockOnChange = vi.fn()

      // Act
      const { result } = renderHook(() => useTachesDnd(mockOnChange))

      // Assert
      await waitFor(() => {
        expect(result.current.taches).toEqual([])
        expect(mockOnChange).not.toHaveBeenCalled()
      })
    })
  })

  describe('toggleDone', () => {
    it('doit basculer l\'état "fait" d\'une tâche', async () => {
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

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockTaches,
          error: null,
          aborted: false,
        })
        // Mock toggleDone update
        .mockResolvedValueOnce({
          error: null,
          aborted: false,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn(),
          }),
        }),
      })

      const mockOnChange = vi.fn()

      // Act
      const { result } = renderHook(() => useTachesDnd(mockOnChange))

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(1)
      })

      await act(async () => {
        await result.current.toggleDone('1', true)
      })

      // Assert
      expect(result.current.doneMap['1']).toBe(true)
      expect(mockOnChange).toHaveBeenCalledWith(1, 1) // 1 done, 1 total
    })
  })

  describe('resetAll', () => {
    it('doit remettre toutes les tâches à fait=false', async () => {
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
          aujourdhui: true,
          position: 1,
        },
      ]

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockTaches,
          error: null,
          aborted: false,
        })
        // Mock resetAll update
        .mockResolvedValueOnce({
          error: null,
          aborted: false,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn(),
          }),
        }),
      })

      const mockOnChange = vi.fn()

      // Act
      const { result } = renderHook(() => useTachesDnd(mockOnChange))

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(2)
      })

      await act(async () => {
        await result.current.resetAll()
      })

      // Assert
      expect(result.current.doneMap['1']).toBe(false)
      expect(result.current.doneMap['2']).toBe(false)
      expect(mockOnChange).toHaveBeenCalledWith(0, 2) // 0 done, 2 total
    })
  })

  describe('moveTask', () => {
    it('doit réordonner les tâches lors du drag & drop', async () => {
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
          fait: false,
          aujourdhui: true,
          position: 1,
        },
        {
          id: '3',
          label: 'Tâche 3',
          fait: false,
          aujourdhui: true,
          position: 2,
        },
      ]

      mockWithAbortSafe.mockResolvedValue({
        data: mockTaches,
        error: null,
        aborted: false,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(),
            }),
          }),
        }),
      })

      const mockOnChange = vi.fn()

      // Act
      const { result } = renderHook(() => useTachesDnd(mockOnChange))

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(3)
      })

      act(() => {
        // Déplacer tâche 1 (index 0) à la position de tâche 3 (index 2)
        result.current.moveTask('1', '3')
      })

      // Assert - Vérifier que l'état result.current.taches a changé
      await waitFor(() => {
        expect(result.current.taches).toHaveLength(3)
        expect(result.current.taches[0].id).toBe('2') // Tâche 2 passe en premier
        expect(result.current.taches[1].id).toBe('3') // Tâche 3 en deuxième
        expect(result.current.taches[2].id).toBe('1') // Tâche 1 en dernier
      })
    })
  })

  describe('saveOrder', () => {
    it('doit sauvegarder le nouvel ordre en DB', async () => {
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
          fait: false,
          aujourdhui: true,
          position: 1,
        },
      ]

      // Mock initial load
      mockWithAbortSafe.mockResolvedValue({
        data: mockTaches,
        error: null,
        aborted: false,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn(),
          }),
        }),
      })

      const mockOnChange = vi.fn()

      // Act
      const { result } = renderHook(() => useTachesDnd(mockOnChange))

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(2)
      })

      const reorderedList = [
        {
          id: '2',
          label: 'Tâche 2',
          fait: false,
          aujourdhui: true,
          position: 0,
        },
        {
          id: '1',
          label: 'Tâche 1',
          fait: false,
          aujourdhui: true,
          position: 1,
        },
      ]

      await act(async () => {
        await result.current.saveOrder(reorderedList)
      })

      // Assert
      expect(result.current.taches).toEqual(reorderedList)
      expect(mockSupabase.from).toHaveBeenCalledWith('taches')
    })

    it('doit gérer les erreurs de sauvegarde et recharger', async () => {
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

      // Mock initial load (2 fois : initial + reload après erreur)
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockTaches,
          error: null,
          aborted: false,
        })
        // Mock saveOrder error
        .mockResolvedValueOnce({
          error: { message: 'Network error', code: 'PGRST301' },
          aborted: false,
        })
        // Mock reload après erreur
        .mockResolvedValueOnce({
          data: mockTaches,
          error: null,
          aborted: false,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn(),
          }),
        }),
      })

      const mockOnChange = vi.fn()

      // Act
      const { result } = renderHook(() => useTachesDnd(mockOnChange))

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(1)
      })

      const reorderedList = [
        {
          id: '1',
          label: 'Tâche 1',
          fait: false,
          aujourdhui: true,
          position: 1,
        },
      ]

      await act(async () => {
        await result.current.saveOrder(reorderedList)
      })

      // Assert - Doit recharger après erreur
      await waitFor(() => {
        expect(mockWithAbortSafe).toHaveBeenCalledTimes(3) // load + saveOrder error + reload
      })
    })
  })
})
