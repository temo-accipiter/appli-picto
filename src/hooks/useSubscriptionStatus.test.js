// src/hooks/useSubscriptionStatus.test.js
/**
 * Tests pour le hook useSubscriptionStatus
 *
 * Vérifie :
 * - Chargement du statut d'abonnement Stripe
 * - Gestion des différents statuts (active, trialing, past_due, paused, canceled)
 * - Flags booléens (isActive, isTrial)
 * - Calcul des jours jusqu'à expiration
 * - Détection d'expiration imminente (isExpiringSoon)
 * - Gestion des erreurs et fallback
 */

import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const { mockSupabase, mockAuthContext } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockAuthContext: {
    user: { id: 'test-user-123' },
    authReady: true,
  },
}))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/contexts/AuthContext', () => ({
  AuthContext: {
    _currentValue: mockAuthContext,
  },
}))

// Mock useContext pour retourner notre mockAuthContext
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useContext: vi.fn(() => mockAuthContext),
  }
})

describe('useSubscriptionStatus', () => {
  // Import dynamique du hook (après les mocks)
  let useSubscriptionStatus
  beforeAll(async () => {
    useSubscriptionStatus = (await import('./useSubscriptionStatus')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthContext.user = { id: 'test-user-123' }
    mockAuthContext.authReady = true
  })

  describe('Chargement du statut', () => {
    it('doit charger un abonnement actif', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000) // +30 jours
      const mockAbonnement = {
        status: 'active',
        current_period_end: futureDate.toISOString(),
        cancel_at: null,
        cancel_at_period_end: false,
        price_id: 'price_123',
        plan: 'premium',
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockAbonnement,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.status).toBe('active')
        expect(result.current.isActive).toBe(true)
        expect(result.current.isTrial).toBe(false)
        expect(result.current.daysUntilExpiry).toBeGreaterThan(25)
        expect(result.current.isExpiringSoon).toBe(false)
      })
    })

    it("doit détecter un abonnement en période d'essai", async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 14 * 24 * 3600 * 1000) // +14 jours
      const mockAbonnement = {
        status: 'trialing',
        current_period_end: futureDate.toISOString(),
        cancel_at: null,
        cancel_at_period_end: false,
        price_id: 'price_123',
        plan: 'premium',
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockAbonnement,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.status).toBe('trialing')
        expect(result.current.isActive).toBe(true) // trialing est considéré actif
        expect(result.current.isTrial).toBe(true)
      })
    })

    it('doit détecter un abonnement avec paiement en retard', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 7 * 24 * 3600 * 1000) // +7 jours
      const mockAbonnement = {
        status: 'past_due',
        current_period_end: futureDate.toISOString(),
        cancel_at: null,
        cancel_at_period_end: false,
        price_id: 'price_123',
        plan: 'premium',
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockAbonnement,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.status).toBe('past_due')
        expect(result.current.isActive).toBe(true) // past_due est toujours actif
      })
    })

    it('doit détecter un abonnement en pause', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000) // +30 jours
      const mockAbonnement = {
        status: 'paused',
        current_period_end: futureDate.toISOString(),
        cancel_at: null,
        cancel_at_period_end: false,
        price_id: 'price_123',
        plan: 'premium',
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockAbonnement,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.status).toBe('paused')
        expect(result.current.isActive).toBe(true) // paused est toujours actif
      })
    })

    it('doit détecter un abonnement annulé', async () => {
      // Arrange
      const mockAbonnement = {
        status: 'canceled',
        current_period_end: null,
        cancel_at: null,
        cancel_at_period_end: true,
        price_id: 'price_123',
        plan: 'premium',
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockAbonnement,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.status).toBe('canceled')
        expect(result.current.isActive).toBe(false) // canceled n'est pas actif
      })
    })

    it('doit détecter un abonnement expirant bientôt (< 7 jours)', async () => {
      // Arrange
      const soonDate = new Date(Date.now() + 5 * 24 * 3600 * 1000) // +5 jours
      const mockAbonnement = {
        status: 'active',
        current_period_end: soonDate.toISOString(),
        cancel_at: null,
        cancel_at_period_end: false,
        price_id: 'price_123',
        plan: 'premium',
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockAbonnement,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.isExpiringSoon).toBe(true)
        expect(result.current.daysUntilExpiry).toBeLessThanOrEqual(7)
      })
    })

    it("doit gérer le cas où aucun abonnement n'existe", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.status).toBe(null)
        expect(result.current.isActive).toBe(false)
        expect(result.current.isTrial).toBe(false)
        expect(result.current.daysUntilExpiry).toBe(null)
        expect(result.current.isExpiringSoon).toBe(false)
      })
    })

    it("doit fallback à null en cas d'erreur", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Network error', code: 'PGRST301' },
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.status).toBe(null)
        expect(result.current.isActive).toBe(false)
      })
    })

    it('doit retourner loading=true si authReady=false', async () => {
      // Arrange
      mockAuthContext.authReady = false

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(true)
      })
    })

    it('doit gérer le cas où user=null', async () => {
      // Arrange
      mockAuthContext.user = null
      mockAuthContext.authReady = true

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Act
      const { result } = renderHook(() => useSubscriptionStatus())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.status).toBe(null)
        expect(result.current.currentPeriodEnd).toBe(null)
      })
    })
  })
})
