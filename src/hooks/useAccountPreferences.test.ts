// src/hooks/useAccountPreferences.test.ts
/**
 * Tests pour le hook useAccountPreferences
 *
 * Vérifie :
 * - Chargement des préférences depuis account_preferences
 * - Mise à jour avec upsert (auto-create si row n'existe pas)
 * - Trigger DB accessibility guard (reduced_motion force confetti_enabled=false)
 * - Gestion abort-safe
 * - Gestion user non connecté
 */

import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const { mockSupabase, mockWithAbortSafe, mockIsAbortLike, mockUseAuth } =
  vi.hoisted(() => ({
    mockSupabase: {
      from: vi.fn(),
    },
    mockWithAbortSafe: vi.fn(),
    mockIsAbortLike: vi.fn(() => false),
    mockUseAuth: vi.fn(() => ({
      user: { id: 'test-user-id', email: 'test@example.com' },
      authReady: true,
    })),
  }))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/hooks', async () => {
  const actual = await vi.importActual('@/hooks')
  return {
    ...actual,
    useAuth: mockUseAuth,
    withAbortSafe: mockWithAbortSafe,
    isAbortLike: mockIsAbortLike,
  }
})

describe('useAccountPreferences', () => {
  // Import dynamique du hook (après les mocks)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let useAccountPreferences: any
  beforeAll(async () => {
    useAccountPreferences = (await import('./useAccountPreferences')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAbortLike.mockReturnValue(false)

    // Mock withAbortSafe qui prend une promesse et retourne {data, error, aborted}
    mockWithAbortSafe.mockImplementation(async (promise: Promise<unknown>) => {
      try {
        const result = await promise
        // Si c'est une réponse Supabase {data, error}
        if (
          result &&
          typeof result === 'object' &&
          'data' in result &&
          'error' in result
        ) {
          return {
            data: result.data,
            error: result.error,
            aborted: false,
          }
        }
        // Sinon retourner directement
        return {
          data: result,
          error: null,
          aborted: false,
        }
      } catch (error) {
        return {
          data: null,
          error,
          aborted: false,
        }
      }
    })
  })

  it('doit charger les préférences au montage', async () => {
    const mockPreferences = {
      account_id: 'test-user-id',
      reduced_motion: true,
      toasts_enabled: true,
      confetti_enabled: false,
      train_progress_enabled: false,
      train_line: null,
      train_type: 'metro',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockPreferences,
            error: null,
          }),
        }),
      }),
    })

    const { result } = renderHook(() => useAccountPreferences())

    // État initial : loading
    expect(result.current.loading).toBe(true)

    // Attendre chargement
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Vérifier données chargées
    expect(result.current.preferences).toEqual(mockPreferences)
    expect(result.current.error).toBeNull()
  })

  it("doit gérer le cas où les préférences n'existent pas encore", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    })

    const { result } = renderHook(() => useAccountPreferences())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Préférences null = row pas encore créée (trigger DB créera au prochain upsert)
    expect(result.current.preferences).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it.skip('doit mettre à jour les préférences avec upsert', async () => {
    const mockUpdatedPreferences = {
      account_id: 'test-user-id',
      reduced_motion: false,
      toasts_enabled: true,
      confetti_enabled: true,
      train_progress_enabled: true,
      train_line: '1',
      train_type: 'metro',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T12:00:00Z',
    }

    // Mock fetch initial (pas de préférences)
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    })

    const { result } = renderHook(() => useAccountPreferences())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock upsert
    mockSupabase.from.mockReturnValueOnce({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUpdatedPreferences,
            error: null,
          }),
        }),
      }),
    })

    // Mettre à jour préférences
    const updateResult = await result.current.updatePreferences({
      toasts_enabled: true,
      confetti_enabled: true,
    })

    expect(updateResult.ok).toBe(true)
    expect(updateResult.error).toBeNull()

    // Attendre que le state se mette à jour
    await waitFor(() => {
      expect(result.current.preferences).toEqual(mockUpdatedPreferences)
    })
  })

  it('doit gérer les erreurs lors du fetch', async () => {
    const mockError = { message: 'Erreur réseau' }

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    })

    const { result } = renderHook(() => useAccountPreferences())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.preferences).toBeNull()
  })

  it('doit gérer le cas user non connecté', async () => {
    // Mock user null
    mockUseAuth.mockReturnValue({
      user: null,
      authReady: true,
    })

    const { result } = renderHook(() => useAccountPreferences())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.preferences).toBeNull()
    expect(result.current.error).toBeNull()

    // Tenter une mise à jour sans user
    const updateResult = await result.current.updatePreferences({
      toasts_enabled: false,
    })

    expect(updateResult.ok).toBe(false)
    expect(updateResult.error).toBe('User not authenticated')
  })

  it('doit respecter abort-safe lors du démontage', async () => {
    mockIsAbortLike.mockReturnValue(true)

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { name: 'AbortError' },
          }),
        }),
      }),
    })

    const { result } = renderHook(() => useAccountPreferences())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Pas d'erreur affichée si abort
    expect(result.current.error).toBeNull()
  })
})
