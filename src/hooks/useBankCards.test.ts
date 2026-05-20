// src/hooks/useBankCards.test.ts
/**
 * Tests useBankCards — hydratation category_id via pivot user_card_categories
 *
 * Couvre :
 * - Cas authenticated : hydrate category_id depuis user_card_categories (mapping présent)
 * - Cas authenticated : category_id = null si aucun mapping (fallback applicatif "Sans catégorie")
 * - Cas visitor (anon) : pas de 2e requête, category_id = null sur toutes les cartes
 * - Test intégration trigger remap (décision 4) : it.skip + commentaire validation manuelle
 *
 * Pattern : voir useCategories.test.ts (mocks vi.hoisted + chaîne Supabase).
 */

import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockSupabase, mockUser, mockUseAuth, mockUseAccountStatus } =
  vi.hoisted(() => ({
    mockSupabase: {
      from: vi.fn(),
    },
    mockUser: {
      id: 'user-abc',
    },
    mockUseAuth: vi.fn(),
    mockUseAccountStatus: vi.fn(),
  }))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/hooks/useAuth', () => ({
  default: mockUseAuth,
}))

vi.mock('@/hooks/useAccountStatus', () => ({
  default: mockUseAccountStatus,
}))

vi.mock('@/contexts/RealtimeBankCardsContext', () => ({
  useRealtimeBankCards: () => ({
    channel: {
      on: vi.fn().mockReturnThis(),
    },
    sendBroadcast: vi.fn(),
  }),
}))

import useBankCards from './useBankCards'

// Chaîne fetch cards : .from('cards').select('*').eq('type','bank').order().abortSignal()
const cardsFetchChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        abortSignal: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  }),
})

// Chaîne fetch pivot : .from('user_card_categories').select(...).eq('user_id', id).abortSignal()
const pivotFetchChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      abortSignal: vi.fn().mockResolvedValue({ data, error }),
    }),
  }),
})

describe('useBankCards — hydratation category_id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccountStatus.mockReturnValue({ isAdmin: false })
  })

  it('hydrate category_id depuis user_card_categories quand un mapping existe', async () => {
    mockUseAuth.mockReturnValue({ user: mockUser, authReady: true })

    const bankCards = [
      {
        id: 'card-1',
        type: 'bank',
        published: true,
        account_id: null,
        name: 'Manger',
        image_url: 'a.jpg',
      },
      {
        id: 'card-2',
        type: 'bank',
        published: true,
        account_id: null,
        name: 'Boire',
        image_url: 'b.jpg',
      },
    ]
    const mappings = [{ card_id: 'card-1', category_id: 'cat-repas' }]

    mockSupabase.from
      .mockReturnValueOnce(cardsFetchChain(bankCards))
      .mockReturnValueOnce(pivotFetchChain(mappings))

    const { result } = renderHook(() => useBankCards())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.cards).toHaveLength(2)
    const [first, second] = result.current.cards
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first?.category_id).toBe('cat-repas')
    // card-2 sans mapping → fallback null (ux.md §12 "Sans catégorie" applicatif)
    expect(second?.category_id).toBeNull()
  })

  it('renvoie category_id=null pour toutes les cartes si aucun mapping', async () => {
    mockUseAuth.mockReturnValue({ user: mockUser, authReady: true })

    const bankCards = [
      {
        id: 'card-1',
        type: 'bank',
        published: true,
        account_id: null,
        name: 'X',
        image_url: 'x.jpg',
      },
    ]

    mockSupabase.from
      .mockReturnValueOnce(cardsFetchChain(bankCards))
      .mockReturnValueOnce(pivotFetchChain([]))

    const { result } = renderHook(() => useBankCards())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const [card] = result.current.cards
    expect(card).toBeDefined()
    expect(card?.category_id).toBeNull()
  })

  it('skip la requête pivot quand visitor (anon) et renvoie category_id=null', async () => {
    mockUseAuth.mockReturnValue({ user: null, authReady: true })

    const bankCards = [
      {
        id: 'card-1',
        type: 'bank',
        published: true,
        account_id: null,
        name: 'X',
        image_url: 'x.jpg',
      },
    ]

    mockSupabase.from.mockReturnValue(cardsFetchChain(bankCards))

    const { result } = renderHook(() => useBankCards())

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Vérif : pas de requête sur le pivot user_card_categories (visitor → skip)
    const tablesQueried = mockSupabase.from.mock.calls.map(call => call[0])
    expect(tablesQueried).not.toContain('user_card_categories')
    const [card] = result.current.cards
    expect(card).toBeDefined()
    expect(card?.category_id).toBeNull()
  })
})

describe('Trigger remap catégorie supprimée (migration 20260130108000)', () => {
  // Décision 4 (locked) : test d'intégration trigger remap OBLIGATOIRE.
  // Cas : assigner catégorie custom à une carte banque via user_card_categories,
  // supprimer la catégorie custom, vérifier que la ligne pivot est réassignée
  // vers "Sans catégorie" (is_system=TRUE) OU supprimée selon la stratégie du trigger.
  //
  // ⚠️ Impossible à tester depuis Vitest sans DB locale Supabase en service :
  // ce test exige une vraie DB postgres (insert pivot, delete category, lecture pivot).
  // Validation manuelle requise via :
  //   1) pnpm supabase:start
  //   2) Connecté Subscriber, assigner catégorie custom à une carte banque
  //   3) Supprimer la catégorie custom depuis la modal de gestion
  //   4) Vérifier en DB que la ligne user_card_categories pointe vers la catégorie
  //      is_system=TRUE de l'utilisateur (ou est supprimée, selon la stratégie de la migration)
  // Le trigger DB est inchangé par cette feature — il s'applique déjà aux cartes
  // personnelles ; la décision 4 ne fait que vérifier qu'il fonctionne aussi
  // avec card.type='bank' (RLS et FK n'imposent aucune contrainte sur le type).
  it.skip('réassigne ou supprime le mapping user_card_categories lors de la suppression de la catégorie custom (validation manuelle requise — DB locale)', () => {
    // À implémenter en test d'intégration Supabase (script SQL ou Playwright + DB)
  })
})
