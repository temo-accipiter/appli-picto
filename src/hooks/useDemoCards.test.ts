// src/hooks/useDemoCards.test.js
/**
 * Tests pour le hook useDemoCards
 *
 * Vérifie :
 * - Chargement des cartes de démonstration (visiteurs uniquement)
 * - Filtrage par type (tasks vs rewards)
 * - Statistiques (total, active, inactive, tasks, rewards)
 * - Sélecteurs (getCardsByType, getActiveCards, getInactiveCards)
 * - Actions admin (create, update, delete, reorder, toggle)
 * - Gestion des erreurs et abort-safe
 * - Comportement pour utilisateurs connectés (pas de fetch)
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const { mockSupabase, mockAuth, mockWithAbortSafe, mockIsAbortLike } =
  vi.hoisted(() => ({
    mockSupabase: {
      from: vi.fn(),
      channel: vi.fn(),
      removeChannel: vi.fn(),
    },
    mockAuth: {
      user: null, // Par défaut : visiteur
      authReady: true,
    },
    mockWithAbortSafe: vi.fn(),
    mockIsAbortLike: vi.fn(() => false),
  }))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: () => mockAuth,
    withAbortSafe: mockWithAbortSafe,
    isAbortLike: mockIsAbortLike,
  }
})

describe('useDemoCards', () => {
  // Import dynamique du hook (après les mocks)
  let useDemoCards
  beforeAll(async () => {
    useDemoCards = (await import('./useDemoCards')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAbortLike.mockReturnValue(false)
    mockAuth.user = null // Visiteur par défaut
    mockAuth.authReady = true

    // Mock channel subscription par défaut
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }
    mockSupabase.channel.mockReturnValue(mockChannel)
  })

  describe('Chargement des cartes (visiteur)', () => {
    it('doit charger les cartes de démonstration pour un visiteur', async () => {
      // Arrange
      const mockDemoCards = [
        {
          id: '1',
          card_type: 'task',
          label: 'Tâche démo 1',
          imagepath: 'demo1.jpg',
          position: 1,
          is_active: true,
        },
        {
          id: '2',
          card_type: 'task',
          label: 'Tâche démo 2',
          imagepath: 'demo2.jpg',
          position: 2,
          is_active: true,
        },
        {
          id: '3',
          card_type: 'reward',
          label: 'Récompense démo',
          imagepath: 'reward1.jpg',
          position: 3,
          is_active: true,
        },
      ]

      mockWithAbortSafe.mockResolvedValue({
        data: mockDemoCards,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.demoCards).toHaveLength(3)
        expect(result.current.demoTasks).toHaveLength(2)
        expect(result.current.demoRewards).toHaveLength(1)
        expect(result.current.stats.total).toBe(3)
        expect(result.current.stats.tasks).toBe(2)
        expect(result.current.stats.rewards).toBe(1)
      })
    })

    it('ne doit PAS charger les cartes pour un utilisateur connecté', async () => {
      // Arrange
      mockAuth.user = { id: 'test-user-123' } // Utilisateur connecté

      mockWithAbortSafe.mockResolvedValue({
        data: [],
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.demoCards).toEqual([])
        expect(result.current.demoTasks).toEqual([])
        expect(result.current.demoRewards).toEqual([])
        expect(mockWithAbortSafe).not.toHaveBeenCalled() // Pas de fetch
      })
    })

    it('doit gérer les erreurs de chargement', async () => {
      // Arrange
      const mockError = { message: 'Network error', code: 'PGRST301' }

      mockWithAbortSafe.mockResolvedValue({
        data: null,
        error: mockError,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe(
          'Impossible de charger les cartes de démonstration'
        )
        expect(result.current.demoCards).toEqual([])
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
            order: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe(null)
      })
    })
  })

  describe('Sélecteurs', () => {
    it('doit filtrer les cartes par type', async () => {
      // Arrange
      const mockDemoCards = [
        { id: '1', card_type: 'task', label: 'Task 1', is_active: true },
        { id: '2', card_type: 'reward', label: 'Reward 1', is_active: true },
        { id: '3', card_type: 'task', label: 'Task 2', is_active: true },
      ]

      mockWithAbortSafe.mockResolvedValue({
        data: mockDemoCards,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      // Assert
      await waitFor(() => {
        expect(result.current.getCardsByType('task')).toHaveLength(2)
        expect(result.current.getCardsByType('reward')).toHaveLength(1)
      })
    })

    it('doit filtrer les cartes actives/inactives', async () => {
      // Arrange
      const mockDemoCards = [
        { id: '1', card_type: 'task', label: 'Task 1', is_active: true },
        { id: '2', card_type: 'task', label: 'Task 2', is_active: false },
        { id: '3', card_type: 'reward', label: 'Reward 1', is_active: true },
      ]

      mockWithAbortSafe.mockResolvedValue({
        data: mockDemoCards,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      // Assert
      await waitFor(() => {
        expect(result.current.getActiveCards()).toHaveLength(2)
        expect(result.current.getInactiveCards()).toHaveLength(1)
        expect(result.current.stats.active).toBe(2)
        expect(result.current.stats.inactive).toBe(1)
      })
    })
  })

  describe('Actions admin', () => {
    it('doit créer une nouvelle carte de démonstration', async () => {
      // Arrange
      const newCardData = {
        type: 'task',
        label: 'Nouvelle tâche',
        imagepath: 'new.jpg',
        position: 1,
      }

      // Mock initial load (empty)
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        // Mock refresh après create
        .mockResolvedValueOnce({
          data: [
            {
              id: '1',
              card_type: 'task',
              label: 'Nouvelle tâche',
              imagepath: 'new.jpg',
              position: 1,
              is_active: true,
            },
          ],
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: '1',
                card_type: 'task',
                label: 'Nouvelle tâche',
                imagepath: 'new.jpg',
                position: 1,
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let newCard
      await act(async () => {
        newCard = await result.current.createDemoCard(newCardData)
      })

      // Assert
      expect(newCard).toBeTruthy()
      expect(newCard.label).toBe('Nouvelle tâche')
      await waitFor(() => {
        expect(result.current.demoCards).toHaveLength(1)
      })
    })

    it('doit mettre à jour une carte de démonstration', async () => {
      // Arrange
      const mockDemoCards = [
        { id: '1', card_type: 'task', label: 'Tâche 1', is_active: true },
      ]

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockDemoCards,
          error: null,
        })
        // Mock refresh après update
        .mockResolvedValueOnce({
          data: [
            {
              id: '1',
              card_type: 'task',
              label: 'Tâche modifiée',
              is_active: true,
            },
          ],
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '1',
                  card_type: 'task',
                  label: 'Tâche modifiée',
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      await waitFor(() => {
        expect(result.current.demoCards).toHaveLength(1)
      })

      await act(async () => {
        await result.current.updateDemoCard('1', { label: 'Tâche modifiée' })
      })

      // Assert
      await waitFor(() => {
        expect(result.current.demoCards[0].label).toBe('Tâche modifiée')
      })
    })

    it('doit supprimer une carte de démonstration', async () => {
      // Arrange
      const mockDemoCards = [
        { id: '1', card_type: 'task', label: 'Tâche 1', is_active: true },
        { id: '2', card_type: 'task', label: 'Tâche 2', is_active: true },
      ]

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockDemoCards,
          error: null,
        })
        // Mock refresh après delete
        .mockResolvedValueOnce({
          data: [
            { id: '2', card_type: 'task', label: 'Tâche 2', is_active: true },
          ],
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      await waitFor(() => {
        expect(result.current.demoCards).toHaveLength(2)
      })

      let success
      await act(async () => {
        success = await result.current.deleteDemoCard('1')
      })

      // Assert
      expect(success).toBe(true)
      await waitFor(() => {
        expect(result.current.demoCards).toHaveLength(1)
        expect(result.current.demoCards[0].id).toBe('2')
      })
    })

    it('doit réorganiser les cartes', async () => {
      // Arrange
      const mockDemoCards = [
        {
          id: '1',
          card_type: 'task',
          label: 'Tâche 1',
          position: 1,
          is_active: true,
        },
        {
          id: '2',
          card_type: 'task',
          label: 'Tâche 2',
          position: 2,
          is_active: true,
        },
      ]

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockDemoCards,
          error: null,
        })
        // Mock refresh après reorder
        .mockResolvedValueOnce({
          data: [
            {
              id: '2',
              card_type: 'task',
              label: 'Tâche 2',
              position: 1,
              is_active: true,
            },
            {
              id: '1',
              card_type: 'task',
              label: 'Tâche 1',
              position: 2,
              is_active: true,
            },
          ],
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({
          error: null,
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      await waitFor(() => {
        expect(result.current.demoCards).toHaveLength(2)
      })

      let success
      await act(async () => {
        success = await result.current.reorderDemoCards(['2', '1'])
      })

      // Assert
      expect(success).toBe(true)
      await waitFor(() => {
        expect(result.current.demoCards[0].id).toBe('2')
        expect(result.current.demoCards[1].id).toBe('1')
      })
    })

    it("doit toggle l'état actif/inactif d'une carte", async () => {
      // Arrange
      const mockDemoCards = [
        { id: '1', card_type: 'task', label: 'Tâche 1', is_active: true },
      ]

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockDemoCards,
          error: null,
        })
        // Mock refresh après toggle
        .mockResolvedValueOnce({
          data: [
            { id: '1', card_type: 'task', label: 'Tâche 1', is_active: false },
          ],
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '1',
                  card_type: 'task',
                  label: 'Tâche 1',
                  is_active: false,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      await waitFor(() => {
        expect(result.current.demoCards).toHaveLength(1)
      })

      await act(async () => {
        await result.current.toggleDemoCard('1', false)
      })

      // Assert
      await waitFor(() => {
        expect(result.current.demoCards[0].is_active).toBe(false)
      })
    })
  })

  describe('refresh', () => {
    it('doit recharger manuellement les cartes', async () => {
      // Arrange
      const mockDemoCards1 = [
        { id: '1', card_type: 'task', label: 'Tâche 1', is_active: true },
      ]
      const mockDemoCards2 = [
        { id: '1', card_type: 'task', label: 'Tâche 1', is_active: true },
        { id: '2', card_type: 'task', label: 'Tâche 2', is_active: true },
      ]

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockDemoCards1,
          error: null,
        })
        // Mock refresh
        .mockResolvedValueOnce({
          data: mockDemoCards2,
          error: null,
        })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useDemoCards())

      await waitFor(() => {
        expect(result.current.demoCards).toHaveLength(1)
      })

      await act(async () => {
        await result.current.refresh()
      })

      // Assert
      await waitFor(() => {
        expect(result.current.demoCards).toHaveLength(2)
      })
    })
  })
})
