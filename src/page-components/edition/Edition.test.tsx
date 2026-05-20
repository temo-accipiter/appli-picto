'use client'

// src/pages/edition/Edition.test.tsx
/**
 * Test d'integration - Page Edition
 *
 * La page Edition a été réarchitecturée (migration UX S12) :
 * - Ancienne UX : 2 sections distinctes "Tâches" + "Récompenses" avec toggle
 * - Nouvelle UX : 1 section unifiée "Bibliothèque de cartes" (CardsEdition)
 *
 * Les tests de comportement détaillé (ajout/suppression carte, filtres)
 * sont couverts par CardsEdition.test.tsx (niveau composant).
 *
 * Couverture :
 * 1) Rendu page sans crash (section "Bibliothèque de cartes")
 * 2) handleDeleteCategory : refetch des caches cartes apres suppression categorie reussie,
 *    aucun refetch en cas d'erreur (DB-first : desync etat local apres trigger DB)
 */

import { waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import Edition from './Edition'

// Capture des props passees a CardsEdition pour invoquer onDeleteCategory directement
const captured: {
  onDeleteCategory?: ((v: string | number) => Promise<void>) | undefined
} = {}

const deleteCategoryMock = vi.fn()
const refreshPersonalCardsMock = vi.fn()

// Mock des hooks de navigation Next.js
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/edition',
}))

// Stub CardsEdition pour capturer la prop onDeleteCategory (mock partiel)
// Les autres exports (SettingsPanel, ModalConfirm, CreateCardModal, ModalQuota) restent reels.
vi.mock('@/components', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components')>()
  return {
    ...actual,
    CardsEdition: (props: {
      onDeleteCategory: (v: string | number) => Promise<void>
    }) => {
      captured.onDeleteCategory = props.onDeleteCategory
      return null
    },
  }
})

// Mock partiel de @/hooks : seuls useCategories et usePersonalCards sont remplaces
vi.mock('@/hooks', async importOriginal => {
  const actual = await importOriginal<typeof import('@/hooks')>()
  return {
    ...actual,
    useCategories: () => ({
      categories: [
        {
          id: 'cat-custom-1',
          name: 'Loisirs',
          is_system: false,
          account_id: 'user-test',
          created_at: '2026-05-20T00:00:00Z',
          updated_at: '2026-05-20T00:00:00Z',
        },
        {
          id: 'cat-system',
          name: 'Sans catégorie',
          is_system: true,
          account_id: 'user-test',
          created_at: '2026-05-20T00:00:00Z',
          updated_at: '2026-05-20T00:00:00Z',
        },
      ],
      loading: false,
      error: null,
      systemCategory: null,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: deleteCategoryMock,
      refresh: vi.fn(),
    }),
    usePersonalCards: () => ({
      cards: [],
      loading: false,
      error: null,
      createCard: vi.fn(),
      updateCard: vi.fn(),
      updateCardCategory: vi.fn(),
      deleteCard: vi.fn(),
      refresh: refreshPersonalCardsMock,
    }),
  }
})

// Props minimaux requis par Edition (architecture S4 : props reçues depuis page.tsx)
const refreshBankCardsMock = vi.fn()
const defaultEditionProps = {
  timeline: null,
  slots: [],
  updateSlot: vi.fn().mockResolvedValue({ error: null }),
  refreshSlots: vi.fn(),
  bankCards: [] as Array<{
    id: string
    name: string
    image_url: string
    published: boolean
    category_id?: string | null
  }>,
  refreshBankCards: refreshBankCardsMock,
  session: null,
}

describe('Edition - Test integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    captured.onDeleteCategory = undefined
  })

  it('affiche la page avec la section Bibliothèque de cartes', async () => {
    renderWithProviders(<Edition {...defaultEditionProps} />)

    // La nouvelle architecture affiche une section unique "Bibliothèque de cartes"
    await waitFor(() => {
      const section = document.querySelector(
        '[aria-label="Bibliothèque de cartes"]'
      )
      expect(section).toBeInTheDocument()
    })

    // La page doit avoir son conteneur principal
    expect(document.querySelector('.page-edition')).toBeInTheDocument()
  })
})

describe('Edition - handleDeleteCategory : refetch apres suppression categorie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    captured.onDeleteCategory = undefined
  })

  it('appelle refreshBankCards et refreshPersonalCards quand deleteCategory reussit', async () => {
    deleteCategoryMock.mockResolvedValue({ error: null })

    renderWithProviders(<Edition {...defaultEditionProps} />)

    await waitFor(() => {
      expect(captured.onDeleteCategory).toBeDefined()
    })

    // Invocation directe du handler expose a CardsEdition (chemin runtime reel :
    // ModalCategory delete -> ModalConfirm -> CardsEdition.handleRemoveCategory -> Edition.handleDeleteCategory)
    await captured.onDeleteCategory!('cat-custom-1')

    expect(deleteCategoryMock).toHaveBeenCalledWith('cat-custom-1')
    expect(refreshBankCardsMock).toHaveBeenCalledTimes(1)
    expect(refreshPersonalCardsMock).toHaveBeenCalledTimes(1)
  })

  it("n'appelle ni refreshBankCards ni refreshPersonalCards quand deleteCategory echoue (refus DB)", async () => {
    deleteCategoryMock.mockResolvedValue({
      error: new Error('RLS refus'),
    })

    renderWithProviders(<Edition {...defaultEditionProps} />)

    await waitFor(() => {
      expect(captured.onDeleteCategory).toBeDefined()
    })

    await captured.onDeleteCategory!('cat-custom-1')

    expect(deleteCategoryMock).toHaveBeenCalledWith('cat-custom-1')
    // Aucun refetch declenche : l'etat local est deja coherent puisque la DB a refuse
    expect(refreshBankCardsMock).not.toHaveBeenCalled()
    expect(refreshPersonalCardsMock).not.toHaveBeenCalled()
  })
})
