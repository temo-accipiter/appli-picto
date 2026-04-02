// src/hooks/useSubscriptionStatus.test.ts
/**
 * Tests pour le hook useSubscriptionStatus (wrapper mince sur useAccountStatus)
 *
 * Ce hook ne parle PAS à Supabase — il délègue à useAccountStatus.
 * On mocke useAccountStatus, pas Supabase.
 *
 * Vérifie :
 * - Propagation de loading/error depuis useAccountStatus
 * - Cohérence isActive = isSubscriber
 * - Calcul de statusDisplay selon status
 * - Valeurs fixes (isTrial, daysUntilExpiry, isExpiringSoon = toujours false/null)
 */

import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockUseAccountStatus } = vi.hoisted(() => ({
  mockUseAccountStatus: vi.fn(),
}))

vi.mock('./useAccountStatus', () => ({
  default: mockUseAccountStatus,
}))

import useSubscriptionStatus from './useSubscriptionStatus'

describe('useSubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('propage loading et error depuis useAccountStatus', () => {
    mockUseAccountStatus.mockReturnValue({
      status: null,
      isSubscriber: false,
      loading: true,
      error: new Error('réseau'),
    })

    const { result } = renderHook(() => useSubscriptionStatus())

    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('isActive = isSubscriber, status propagé tel quel', () => {
    mockUseAccountStatus.mockReturnValue({
      status: 'subscriber',
      isSubscriber: true,
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useSubscriptionStatus())

    expect(result.current.status).toBe('subscriber')
    expect(result.current.isSubscriber).toBe(true)
    expect(result.current.isActive).toBe(true)
  })

  it('calcule statusDisplay selon status', () => {
    mockUseAccountStatus.mockReturnValue({
      status: 'subscriber',
      isSubscriber: true,
      loading: false,
      error: null,
    })

    const { result: r1 } = renderHook(() => useSubscriptionStatus())
    expect(r1.current.statusDisplay).toEqual({
      label: 'Actif',
      icon: '',
      color: 'success',
    })

    mockUseAccountStatus.mockReturnValue({
      status: 'free',
      isSubscriber: false,
      loading: false,
      error: null,
    })
    const { result: r2 } = renderHook(() => useSubscriptionStatus())
    expect(r2.current.statusDisplay).toEqual({
      label: 'Gratuit',
      icon: '',
      color: 'default',
    })

    mockUseAccountStatus.mockReturnValue({
      status: 'admin',
      isSubscriber: false,
      loading: false,
      error: null,
    })
    const { result: r3 } = renderHook(() => useSubscriptionStatus())
    expect(r3.current.statusDisplay).toEqual({
      label: 'Admin',
      icon: '',
      color: 'info',
    })
  })

  it('renvoie toujours isTrial=false, daysUntilExpiry=null, isExpiringSoon=false', () => {
    mockUseAccountStatus.mockReturnValue({
      status: 'subscriber',
      isSubscriber: true,
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useSubscriptionStatus())

    expect(result.current.isTrial).toBe(false)
    expect(result.current.daysUntilExpiry).toBeNull()
    expect(result.current.isExpiringSoon).toBe(false)
    expect(result.current.currentPeriodEnd).toBeNull()
    expect(result.current.subscription).toBeNull()
  })
})
