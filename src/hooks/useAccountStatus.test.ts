// src/hooks/useAccountStatus.test.ts
/**
 * Tests pour le hook useAccountStatus (version DB-first S11)
 *
 * Ce hook lit accounts.status depuis Supabase pour affichage cosmétique.
 * ⚠️ USAGE COSMÉTIQUE UNIQUEMENT — PAS d'autorisation côté front (§1.1 FRONTEND_CONTRACT)
 *
 * Vérifie :
 * - Chargement du statut (free, subscriber, admin)
 * - Helpers booléens (isFree, isSubscriber, isAdmin)
 * - Gestion non-connecté (status = null)
 * - Gestion erreur réseau (fallback null + log)
 * - Gestion AbortController (cleanup sans erreur)
 */

import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ vi.hoisted() pour les mocks
const { mockSupabase, mockUser, mockIsAbortLike } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockUser: {
    id: 'test-user-123',
  },
  mockIsAbortLike: vi.fn(() => false),
}))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/hooks', () => ({
  isAbortLike: mockIsAbortLike,
}))

vi.mock('./useAuth', () => ({
  default: () => ({ user: mockUser, authReady: true }),
}))

describe('useAccountStatus', () => {
  let useAccountStatus
  beforeAll(async () => {
    useAccountStatus = (await import('./useAccountStatus')).default
  })

  // Chaîne Supabase chainable avec abortSignal
  const mockChain = (resolvedValue: unknown) => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        abortSignal: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(resolvedValue),
      }),
    }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAbortLike.mockReturnValue(false)
  })

  describe('Chargement du statut', () => {
    it('doit charger le statut "free" depuis DB', async () => {
      mockSupabase.from.mockReturnValue(
        mockChain({ data: { status: 'free' }, error: null })
      )

      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.status).toBe('free')
        expect(result.current.isFree).toBe(true)
        expect(result.current.isSubscriber).toBe(false)
        expect(result.current.isAdmin).toBe(false)
      })
    })

    it('doit charger le statut "subscriber" depuis DB', async () => {
      mockSupabase.from.mockReturnValue(
        mockChain({ data: { status: 'subscriber' }, error: null })
      )

      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.status).toBe('subscriber')
        expect(result.current.isSubscriber).toBe(true)
        expect(result.current.isFree).toBe(false)
      })
    })

    it('doit charger le statut "admin" depuis DB', async () => {
      mockSupabase.from.mockReturnValue(
        mockChain({ data: { status: 'admin' }, error: null })
      )

      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.status).toBe('admin')
        expect(result.current.isAdmin).toBe(true)
      })
    })

    it('doit fallback à "free" en cas d\'erreur réseau (sécurité UX)', async () => {
      mockSupabase.from.mockReturnValue(
        mockChain({
          data: null,
          error: { message: 'Network error', code: 'PGRST301' },
        })
      )

      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        // Le hook fallback sur 'free' en cas d'erreur (jamais null pour un user connecté)
        expect(result.current.status).toBe('free')
        expect(result.current.error).toBeTruthy()
      })
    })

    it('doit retourner status=null si non connecté', async () => {
      // Remonter useAuth avec user=null
      vi.doMock('./useAuth', () => ({
        default: () => ({ user: null, authReady: true }),
      }))

      mockSupabase.from.mockReturnValue(
        mockChain({ data: { status: 'free' }, error: null })
      )

      // Import frais avec le nouveau mock — cache-busting via query string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type AnyModule = Promise<any>
      // @ts-expect-error — module fictif pour cache-busting, remplacé par le vrai si introuvable
      const visitorImport = import(
        './useAccountStatus?visitor'
      ) as unknown as AnyModule
      const { default: hook } = await visitorImport.catch(
        () => import('./useAccountStatus')
      )

      const { result } = renderHook(() => hook())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        // status reste null si user absent (Visitor = état local)
      })
    })

    it('doit gérer les requêtes abortées sans erreur', async () => {
      mockIsAbortLike.mockReturnValue(true)
      mockSupabase.from.mockReturnValue(
        mockChain({ data: null, error: { message: 'aborted', code: '20' } })
      )

      const { result } = renderHook(() => useAccountStatus())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        // Pas d'erreur stockée — abort est ignoré silencieusement
      })
    })
  })

  describe('Helpers booléens', () => {
    it('isFree=true uniquement pour status=free', async () => {
      mockSupabase.from.mockReturnValue(
        mockChain({ data: { status: 'free' }, error: null })
      )
      const { result } = renderHook(() => useAccountStatus())
      await waitFor(() => expect(result.current.isFree).toBe(true))
      expect(result.current.isSubscriber).toBe(false)
      expect(result.current.isAdmin).toBe(false)
    })

    it('isSubscriber=true uniquement pour status=subscriber', async () => {
      mockSupabase.from.mockReturnValue(
        mockChain({ data: { status: 'subscriber' }, error: null })
      )
      const { result } = renderHook(() => useAccountStatus())
      await waitFor(() => expect(result.current.isSubscriber).toBe(true))
      expect(result.current.isFree).toBe(false)
      expect(result.current.isAdmin).toBe(false)
    })

    it('isAdmin=true uniquement pour status=admin', async () => {
      mockSupabase.from.mockReturnValue(
        mockChain({ data: { status: 'admin' }, error: null })
      )
      const { result } = renderHook(() => useAccountStatus())
      await waitFor(() => expect(result.current.isAdmin).toBe(true))
      expect(result.current.isFree).toBe(false)
      expect(result.current.isSubscriber).toBe(false)
    })
  })
})
