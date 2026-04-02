// src/hooks/useCategories.test.ts
/**
 * Tests pour le hook useCategories
 *
 * Schéma actuel (post-migration S12) :
 * - Table : categories(id, name, account_id, is_system, created_at, updated_at)
 * - Fetch : .select().eq('account_id', userId).order('is_system').order('name').abortSignal()
 * - addCategory(name: string) — string, pas objet
 * - updateCategory(id, name) — par id
 * - deleteCategory(id) — par id
 * - systemCategory : catégorie with is_system=true (lecture seule côté front)
 *
 * Vérifie :
 * - Chargement des catégories de l'utilisateur
 * - Ajout de catégorie
 * - Suppression de catégorie
 * - Gestion erreurs
 * - Cas user non connecté
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ✅ vi.hoisted() pour tous les mocks (hoisting Vitest)
const { mockSupabase, mockUser, mockToast, mockUseAuth } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockUser: {
    id: 'test-user-123',
  },
  mockToast: {
    show: vi.fn(),
  },
  mockUseAuth: vi.fn(),
}))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/hooks', async importOriginal => {
  const actual = await importOriginal<typeof import('@/hooks')>()
  return {
    ...actual,
    useAuth: mockUseAuth,
    useToast: vi.fn(() => mockToast),
  }
})

vi.mock('@/contexts', () => ({
  useToast: () => mockToast,
  useLoading: () => ({ setLoading: vi.fn() }),
}))

// Import direct (après les mocks)
import useCategories from './useCategories'

/**
 * Chaîne Supabase pour le fetch des catégories :
 * .from('categories').select('*').eq(account_id, userId)
 *   .order('is_system', { ascending: false })
 *   .order('name', { ascending: true })
 *   .abortSignal(signal)
 */
const mockFetchChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          abortSignal: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  }),
})

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Par défaut : user connecté
    mockUseAuth.mockReturnValue({ user: mockUser, authReady: true })
  })

  describe('Chargement des catégories', () => {
    it("doit charger les catégories de l'utilisateur", async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Routine',
          account_id: 'test-user-123',
          is_system: false,
        },
        {
          id: '2',
          name: 'École',
          account_id: 'test-user-123',
          is_system: false,
        },
        {
          id: '3',
          name: 'Sans catégorie',
          account_id: 'test-user-123',
          is_system: true,
        },
      ]

      mockSupabase.from.mockReturnValue(mockFetchChain(mockCategories))

      const { result } = renderHook(() => useCategories())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.categories).toHaveLength(3)
      })

      // La catégorie système est exposée séparément
      expect(result.current.systemCategory?.is_system).toBe(true)
    })

    it("doit retourner un tableau vide si pas d'utilisateur", async () => {
      mockUseAuth.mockReturnValue({ user: null, authReady: true })

      const { result } = renderHook(() => useCategories())

      await waitFor(() => {
        expect(result.current.categories).toEqual([])
        expect(result.current.loading).toBe(false)
      })
    })

    it('doit gérer les erreurs de chargement', async () => {
      mockSupabase.from.mockReturnValue(
        mockFetchChain(null, { message: 'Network error', code: 'PGRST301' })
      )

      const { result } = renderHook(() => useCategories())

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('addCategory', () => {
    it('doit ajouter une nouvelle catégorie', async () => {
      const existingCategories = [
        {
          id: '1',
          name: 'Routine',
          account_id: 'test-user-123',
          is_system: false,
        },
      ]
      const newCategory = {
        id: '2',
        name: 'Sport',
        account_id: 'test-user-123',
        is_system: false,
      }

      mockSupabase.from
        // Premier from() → fetch initial
        .mockReturnValueOnce(mockFetchChain(existingCategories))
        // Deuxième from() → insert
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: newCategory, error: null }),
            }),
          }),
        })
        // Troisième from() → fetch après refresh
        .mockReturnValueOnce(
          mockFetchChain([...existingCategories, newCategory])
        )

      const { result } = renderHook(() => useCategories())

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.addCategory('Sport')
      })

      expect(mockToast.show).toHaveBeenCalledWith('Catégorie créée', 'success')
    })

    it("doit gérer les erreurs d'ajout", async () => {
      mockSupabase.from
        .mockReturnValueOnce(mockFetchChain([]))
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Duplicate key error', code: '23505' },
              }),
            }),
          }),
        })

      const { result } = renderHook(() => useCategories())

      await waitFor(() => expect(result.current.loading).toBe(false))

      const response = await act(async () => {
        return await result.current.addCategory('Duplicate')
      })

      expect(response.error).toBeTruthy()
      expect(mockToast.show).toHaveBeenCalledWith(
        'Impossible de créer la catégorie',
        'error'
      )
    })
  })

  describe('updateCategory', () => {
    it("doit mettre à jour le nom d'une catégorie", async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Routine',
          account_id: 'test-user-123',
          is_system: false,
        },
      ]

      mockSupabase.from
        .mockReturnValueOnce(mockFetchChain(mockCategories))
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        })
        .mockReturnValueOnce(
          mockFetchChain([{ ...mockCategories[0], name: 'Routine Modifiée' }])
        )

      const { result } = renderHook(() => useCategories())

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.updateCategory('1', 'Routine Modifiée')
      })

      expect(mockToast.show).toHaveBeenCalledWith(
        'Catégorie modifiée',
        'success'
      )
    })
  })

  describe('deleteCategory', () => {
    it('doit supprimer une catégorie par id', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Routine',
          account_id: 'test-user-123',
          is_system: false,
        },
        {
          id: '2',
          name: 'École',
          account_id: 'test-user-123',
          is_system: false,
        },
      ]

      mockSupabase.from
        .mockReturnValueOnce(mockFetchChain(mockCategories))
        .mockReturnValueOnce({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        })
        .mockReturnValueOnce(mockFetchChain([mockCategories[1]]))

      const { result } = renderHook(() => useCategories())

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.deleteCategory('1')
      })

      expect(mockToast.show).toHaveBeenCalledWith(
        'Catégorie supprimée',
        'success'
      )
    })
  })

  describe('refresh', () => {
    it('doit recharger manuellement les catégories', async () => {
      const initial = [
        {
          id: '1',
          name: 'Routine',
          account_id: 'test-user-123',
          is_system: false,
        },
      ]
      const afterRefresh = [
        ...initial,
        {
          id: '2',
          name: 'Nouvelle',
          account_id: 'test-user-123',
          is_system: false,
        },
      ]

      mockSupabase.from
        .mockReturnValueOnce(mockFetchChain(initial))
        .mockReturnValueOnce(mockFetchChain(afterRefresh))

      const { result } = renderHook(() => useCategories())

      await waitFor(() => expect(result.current.categories).toHaveLength(1))

      await act(async () => {
        result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.categories).toHaveLength(2)
      })
    })
  })
})
