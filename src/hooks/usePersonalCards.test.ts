// src/hooks/usePersonalCards.test.ts
/**
 * Tests usePersonalCards — normalisation category_id via user_card_categories + embed is_system
 *
 * Couvre la normalisation systeme→null (fix bug "Sans categorie" non affiche apres reassignation) :
 * - category_id = null (pas de mapping) → null
 * - category_id = systemId (is_system=true)  → null (normalise, invariant TSA)
 * - category_id = customId (is_system=false) → customId inchange
 *
 * Pattern : voir useBankCards.test.ts (mocks vi.hoisted + chaine Supabase).
 */

import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockSupabase, mockUser, mockUseAuth } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockUser: {
    id: 'user-abc',
  },
  mockUseAuth: vi.fn(),
}))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('./useAuth', () => ({
  default: mockUseAuth,
}))

import usePersonalCards from './usePersonalCards'

// Chaine fetch cards : .from('cards').select('*').eq().eq().order().abortSignal()
const cardsFetchChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          abortSignal: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  }),
})

// Chaine fetch pivot : .from('user_card_categories').select(...).eq().abortSignal()
const pivotFetchChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      abortSignal: vi.fn().mockResolvedValue({ data, error }),
    }),
  }),
})

const buildPersonalCard = (overrides: Record<string, unknown> = {}) => ({
  id: 'card-1',
  type: 'personal',
  account_id: 'user-abc',
  name: 'Maison',
  image_url: 'path.jpg',
  created_at: '2026-05-20T00:00:00Z',
  updated_at: '2026-05-20T00:00:00Z',
  ...overrides,
})

describe('usePersonalCards — normalisation category_id (is_system → null)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, authReady: true })
  })

  it('category_id = null quand aucun mapping pivot', async () => {
    mockSupabase.from
      .mockReturnValueOnce(cardsFetchChain([buildPersonalCard()]))
      .mockReturnValueOnce(pivotFetchChain([]))

    const { result } = renderHook(() => usePersonalCards())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const [card] = result.current.cards
    expect(card).toBeDefined()
    expect(card?.category_id).toBeNull()
  })

  it('normalise category_id vers null si la categorie liee est is_system=true (carte reassignee par trigger)', async () => {
    const mappings = [
      {
        card_id: 'card-1',
        category_id: 'cat-system-id',
        categories: { is_system: true },
      },
    ]

    mockSupabase.from
      .mockReturnValueOnce(cardsFetchChain([buildPersonalCard()]))
      .mockReturnValueOnce(pivotFetchChain(mappings))

    const { result } = renderHook(() => usePersonalCards())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const [card] = result.current.cards
    expect(card).toBeDefined()
    // Invariant TSA : reassignee vers systeme = jamais categorisee = null
    expect(card?.category_id).toBeNull()
  })

  it('preserve category_id si la categorie est custom (is_system=false)', async () => {
    const mappings = [
      {
        card_id: 'card-1',
        category_id: 'cat-custom-id',
        categories: { is_system: false },
      },
    ]

    mockSupabase.from
      .mockReturnValueOnce(cardsFetchChain([buildPersonalCard()]))
      .mockReturnValueOnce(pivotFetchChain(mappings))

    const { result } = renderHook(() => usePersonalCards())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const [card] = result.current.cards
    expect(card).toBeDefined()
    expect(card?.category_id).toBe('cat-custom-id')
  })
})
