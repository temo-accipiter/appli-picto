// src/hooks/useTachesEdition.test.js
/**
 * Tests pour le hook useTachesEdition
 *
 * Vérifie :
 * - Chargement des tâches
 * - Toggle "aujourdhui"
 * - Mise à jour label et catégorie
 * - Ajout de tâche avec image
 * - Remplacement d'image
 * - Suppression de tâche avec image
 * - Reset édition
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const {
  mockSupabase,
  mockUser,
  mockUploadImage,
  mockReplaceImage,
  mockDeleteImage,
} = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockUser: {
    id: 'test-user-123',
  },
  mockUploadImage: vi.fn(),
  mockReplaceImage: vi.fn(),
  mockDeleteImage: vi.fn(),
}))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: () => ({ user: mockUser }),
  }
})

vi.mock('@/utils/storage/uploadImage', () => ({
  uploadImage: mockUploadImage,
}))

vi.mock('@/utils/storage/replaceImageIfAny', () => ({
  default: mockReplaceImage,
}))

vi.mock('@/utils/storage/deleteImageIfAny', () => ({
  default: mockDeleteImage,
}))

describe('useTachesEdition', () => {
  // Import dynamique du hook (après les mocks)
  let useTachesEdition
  beforeAll(async () => {
    useTachesEdition = (await import('./useTachesEdition')).default
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
          categorie: 'routine',
          fait: false,
          aujourdhui: true,
          position: 0,
          imagepath: 'images/task1.jpg',
        },
        {
          id: '2',
          label: 'Tâche 2',
          categorie: 'ecole',
          fait: true,
          aujourdhui: false,
          position: 1,
          imagepath: null,
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
      const { result } = renderHook(() => useTachesEdition())

      // Assert
      await waitFor(() => {
        expect(result.current.taches).toHaveLength(2)
        expect(result.current.taches[0].label).toBe('Tâche 1')
        expect(result.current.taches[0].aujourdhui).toBe(true)
      })
    })
  })

  describe('toggleAujourdhui', () => {
    it("doit inverser l'état aujourdhui et remettre fait à false", async () => {
      // Arrange
      const mockTaches = [
        {
          id: '1',
          label: 'Tâche 1',
          fait: true,
          aujourdhui: false,
          position: 0,
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
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useTachesEdition())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(1)
      })

      await act(async () => {
        await result.current.toggleAujourdhui('1', false)
      })

      // Assert
      expect(result.current.taches[0].aujourdhui).toBe(true)
      expect(result.current.taches[0].fait).toBe(false)
    })
  })

  describe('updateLabel', () => {
    it('doit mettre à jour le label de la tâche', async () => {
      // Arrange
      const mockTaches = [{ id: '1', label: 'Ancien label', position: 0 }]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTaches,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useTachesEdition())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(1)
      })

      await act(async () => {
        await result.current.updateLabel('1', 'Nouveau label')
      })

      // Assert
      expect(result.current.taches[0].label).toBe('Nouveau label')
    })
  })

  describe('updateCategorie', () => {
    it('doit mettre à jour la catégorie de la tâche', async () => {
      // Arrange
      const mockTaches = [
        { id: '1', label: 'Tâche', categorie: 'routine', position: 0 },
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
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useTachesEdition())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(1)
      })

      await act(async () => {
        await result.current.updateCategorie('1', 'ecole')
      })

      // Assert
      expect(result.current.taches[0].categorie).toBe('ecole')
    })
  })

  describe('addTacheFromFile', () => {
    it('doit ajouter une tâche avec upload image', async () => {
      // Arrange
      const mockFile = new File(['image'], 'task.jpg', { type: 'image/jpeg' })
      const mockTaches = []

      mockUploadImage.mockResolvedValue({
        path: 'images/new-task.jpg',
        error: null,
      })

      mockSupabase.from.mockImplementation(table => {
        if (table === 'taches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockTaches,
                  error: null,
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'new-1',
                    label: 'Nouvelle tâche',
                    imagepath: 'images/new-task.jpg',
                    fait: false,
                    aujourdhui: true,
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      // Act
      const { result } = renderHook(() => useTachesEdition())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(0)
      })

      let response
      await act(async () => {
        response = await result.current.addTacheFromFile(mockFile, {
          label: 'Nouvelle tâche',
          aujourdhui: true,
        })
      })

      // Assert
      expect(response.error).toBeNull()
      expect(mockUploadImage).toHaveBeenCalledWith(mockFile, {
        userId: 'test-user-123',
        prefix: 'taches',
      })
      expect(result.current.taches).toHaveLength(1)
      expect(result.current.taches[0].label).toBe('Nouvelle tâche')
    })
  })

  describe('updateTacheImage', () => {
    it("doit remplacer l'image d'une tâche", async () => {
      // Arrange
      const mockFile = new File(['new-image'], 'new-task.jpg', {
        type: 'image/jpeg',
      })
      const mockTaches = [
        {
          id: '1',
          label: 'Tâche',
          imagepath: 'images/old-task.jpg',
          position: 0,
        },
      ]

      mockReplaceImage.mockResolvedValue({
        path: 'images/replaced-task.jpg',
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTaches,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: '1', imagepath: 'images/replaced-task.jpg' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useTachesEdition())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(1)
      })

      await act(async () => {
        await result.current.updateTacheImage('1', mockFile)
      })

      // Assert
      expect(mockReplaceImage).toHaveBeenCalledWith(
        'images/old-task.jpg',
        mockFile,
        { userId: 'test-user-123', prefix: 'taches' }
      )
      expect(result.current.taches[0].imagepath).toBe(
        'images/replaced-task.jpg'
      )
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

      mockDeleteImage.mockResolvedValue({ deleted: true, error: null })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTaches,
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
      })

      // Act
      const { result } = renderHook(() => useTachesEdition())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(2)
      })

      await act(async () => {
        await result.current.deleteTache(mockTaches[0])
      })

      // Assert
      expect(mockDeleteImage).toHaveBeenCalledWith('images/task1.jpg')
      expect(result.current.taches).toHaveLength(1)
      expect(result.current.taches[0].id).toBe('2')
    })
  })

  describe('resetEdition', () => {
    it('doit remettre toutes les tâches à aujourdhui=false', async () => {
      // Arrange
      const mockTaches = [
        { id: '1', label: 'Tâche 1', aujourdhui: true, position: 0 },
        { id: '2', label: 'Tâche 2', aujourdhui: true, position: 1 },
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
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useTachesEdition())

      await waitFor(() => {
        expect(result.current.taches).toHaveLength(2)
      })

      await act(async () => {
        await result.current.resetEdition()
      })

      // Assert
      expect(result.current.taches[0].aujourdhui).toBe(false)
      expect(result.current.taches[1].aujourdhui).toBe(false)
    })
  })
})
