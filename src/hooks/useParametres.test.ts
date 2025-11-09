// src/hooks/useParametres.test.js
/**
 * Tests pour le hook useParametres
 *
 * Vérifie :
 * - Chargement des paramètres globaux
 * - Gestion du cas où aucun paramètre n'existe (null)
 * - Insertion de paramètres par défaut
 * - Mise à jour des paramètres
 * - Gestion des erreurs CORS/ITP (Safari)
 * - Gestion abort-safe
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const { mockSupabase, mockWithAbortSafe, mockIsAbortLike } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockWithAbortSafe: vi.fn(),
  mockIsAbortLike: vi.fn(() => false),
}))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/hooks', () => ({
  useAuth: () => ({ authReady: true }),
  withAbortSafe: mockWithAbortSafe,
  isAbortLike: mockIsAbortLike,
}))

describe('useParametres', () => {
  // Import dynamique du hook (après les mocks)
  let useParametres
  beforeAll(async () => {
    useParametres = (await import('./useParametres')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAbortLike.mockReturnValue(false)

    // Configurer le mock Supabase de manière persistante pour tous les appels
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn(),
        }),
      }),
      upsert: vi.fn(),
    })
  })

  describe('Chargement des paramètres', () => {
    it('doit charger les paramètres existants', async () => {
      // Arrange
      const mockParametres = {
        id: 1,
        confettis: true,
        theme: 'light',
      }

      mockWithAbortSafe.mockResolvedValue({
        data: mockParametres,
        error: null,
        aborted: false,
      })

      // Act
      const { result } = renderHook(() => useParametres())

      // Assert
      await waitFor(() => {
        expect(result.current.parametres).toEqual(mockParametres)
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe(null)
      })
    })

    it("doit gérer le cas où aucun paramètre n'existe (null)", async () => {
      // Arrange
      mockWithAbortSafe
        // Premier appel SELECT retourne null
        .mockResolvedValueOnce({
          data: null,
          error: null,
          aborted: false,
        })
        // Deuxième appel UPSERT (auto-init) - on simule un échec pour garder parametres à null
        .mockResolvedValueOnce({
          error: { message: 'Not allowed' },
          aborted: false,
        })

      // Act
      const { result } = renderHook(() => useParametres())

      // Assert
      await waitFor(() => {
        expect(result.current.parametres).toBe(null)
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe(null)
      })
    })

    it('doit gérer les requêtes aborted sans erreur', async () => {
      // Arrange
      mockWithAbortSafe.mockResolvedValue({
        data: null,
        error: null,
        aborted: true, // ✅ Abort
      })

      // Act
      const { result } = renderHook(() => useParametres())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.parametres).toBe(null)
      })
    })

    it('doit gérer les erreurs CORS/ITP (Safari)', async () => {
      // Arrange
      const corsError = {
        message: 'Access Control checks failed',
        code: 'CORS',
      }

      mockWithAbortSafe.mockResolvedValue({
        data: null,
        error: corsError,
        aborted: false,
      })

      // Act
      const { result } = renderHook(() => useParametres())

      // Assert
      await waitFor(() => {
        expect(result.current.error).toEqual(corsError)
        expect(result.current.loading).toBe(false)
      })
    })

    it('doit gérer les erreurs PostgREST (hors PGRST116)', async () => {
      // Arrange
      const pgError = {
        message: 'Permission denied',
        code: 'PGRST301',
      }

      mockWithAbortSafe.mockResolvedValue({
        data: null,
        error: pgError,
        aborted: false,
      })

      // Act
      const { result } = renderHook(() => useParametres())

      // Assert
      await waitFor(() => {
        expect(result.current.error).toEqual(pgError)
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('insertDefaults', () => {
    it('doit insérer des paramètres par défaut', async () => {
      // Arrange
      const defaultValues = { confettis: true, theme: 'light' }

      // Mock initial load (no data)
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: null,
          error: null,
          aborted: false,
        })
        // Mock UPSERT auto-init (on laisse échouer)
        .mockResolvedValueOnce({
          error: { message: 'Auto-init blocked' },
          aborted: false,
        })
        // Mock upsert manuel
        .mockResolvedValueOnce({
          error: null,
          aborted: false,
        })
        // Mock reload après insert
        .mockResolvedValueOnce({
          data: { id: 1, ...defaultValues },
          error: null,
          aborted: false,
        })

      // Act
      const { result } = renderHook(() => useParametres())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let response
      await act(async () => {
        response = await result.current.insertDefaults(defaultValues)
      })

      // Assert
      expect(response.ok).toBe(true)
      expect(response.error).toBe(null)
      await waitFor(() => {
        expect(result.current.parametres).toEqual({ id: 1, ...defaultValues })
      })
    })

    it("doit gérer les erreurs d'insertion", async () => {
      // Arrange
      const insertError = new Error('Insert failed')

      // Mock initial load (no data)
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: null,
          error: null,
          aborted: false,
        })
        // Mock UPSERT auto-init (on laisse échouer pour ne pas créer de paramètres)
        .mockResolvedValueOnce({
          error: { message: 'Auto-init blocked' },
          aborted: false,
        })
        // Mock upsert error pour l'appel manuel à insertDefaults
        .mockResolvedValueOnce({
          error: insertError,
          aborted: false,
        })

      // Act
      const { result } = renderHook(() => useParametres())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let response
      await act(async () => {
        response = await result.current.insertDefaults({ confettis: true })
      })

      // Assert
      expect(response.ok).toBe(false)
      expect(response.error).toBe(insertError)
    })
  })

  describe('updateParametres', () => {
    it('doit mettre à jour les paramètres existants', async () => {
      // Arrange
      const mockParametres = {
        id: 1,
        confettis: true,
        theme: 'light',
      }

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockParametres,
          error: null,
          aborted: false,
        })
        // Mock update
        .mockResolvedValueOnce({
          error: null,
          aborted: false,
        })

      // Act
      const { result } = renderHook(() => useParametres())

      await waitFor(() => {
        expect(result.current.parametres).toEqual(mockParametres)
      })

      let response
      await act(async () => {
        response = await result.current.updateParametres({ confettis: false })
      })

      // Assert
      expect(response.ok).toBe(true)
      expect(response.error).toBe(null)
      expect(result.current.parametres.confettis).toBe(false)
    })

    it("doit créer les paramètres si aucun n'existe", async () => {
      // Arrange
      const defaultValues = { confettis: true }

      // Mock initial load (no data)
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: null,
          error: null,
          aborted: false,
        })
        // Mock UPSERT auto-init (on laisse échouer)
        .mockResolvedValueOnce({
          error: { message: 'Auto-init blocked' },
          aborted: false,
        })
        // Mock upsert manuel (create)
        .mockResolvedValueOnce({
          error: null,
          aborted: false,
        })
        // Mock reload après create
        .mockResolvedValueOnce({
          data: { id: 1, ...defaultValues },
          error: null,
          aborted: false,
        })

      // Act
      const { result } = renderHook(() => useParametres())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let response
      await act(async () => {
        response = await result.current.updateParametres(defaultValues)
      })

      // Assert
      expect(response.ok).toBe(true)
      await waitFor(() => {
        expect(result.current.parametres).toEqual({ id: 1, ...defaultValues })
      })
    })

    it('doit gérer les erreurs de mise à jour', async () => {
      // Arrange
      const mockParametres = { id: 1, confettis: true }
      const updateError = new Error('Update failed')

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockParametres,
          error: null,
          aborted: false,
        })
        // Mock update error
        .mockResolvedValueOnce({
          error: updateError,
          aborted: false,
        })

      // Act
      const { result } = renderHook(() => useParametres())

      await waitFor(() => {
        expect(result.current.parametres).toEqual(mockParametres)
      })

      let response
      await act(async () => {
        response = await result.current.updateParametres({ confettis: false })
      })

      // Assert
      expect(response.ok).toBe(false)
      expect(response.error).toBe(updateError)
    })
  })

  describe('refresh', () => {
    it('doit recharger manuellement les paramètres', async () => {
      // Arrange
      const mockParametres1 = { id: 1, confettis: true }
      const mockParametres2 = { id: 1, confettis: false }

      // Mock initial load
      mockWithAbortSafe
        .mockResolvedValueOnce({
          data: mockParametres1,
          error: null,
          aborted: false,
        })
        // Mock refresh
        .mockResolvedValueOnce({
          data: mockParametres2,
          error: null,
          aborted: false,
        })

      // Act
      const { result } = renderHook(() => useParametres())

      await waitFor(() => {
        expect(result.current.parametres).toEqual(mockParametres1)
      })

      await act(async () => {
        await result.current.refresh()
      })

      // Assert
      await waitFor(() => {
        expect(result.current.parametres).toEqual(mockParametres2)
      })
    })
  })
})
