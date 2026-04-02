'use client'

// src/pages/edition/Edition.test.tsx
/**
 * 🧪 Test d'intégration - Page Edition
 *
 * La page Edition a été réarchitecturée (migration UX S12) :
 * - Ancienne UX : 2 sections distinctes "Tâches" + "Récompenses" avec toggle
 * - Nouvelle UX : 1 section unifiée "Bibliothèque de cartes" (CardsEdition)
 *
 * Les tests de comportement détaillé (ajout/suppression carte, filtres)
 * sont couverts par CardsEdition.test.tsx (niveau composant).
 *
 * Ce fichier teste uniquement le rendu de la page sans crash.
 */

import { waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import Edition from './Edition'

// Props minimaux requis par Edition (architecture S4 : props reçues depuis page.tsx)
const defaultEditionProps = {
  timeline: null,
  slots: [],
  updateSlot: vi.fn().mockResolvedValue({ error: null }),
  refreshSlots: vi.fn(),
  bankCards: [],
  refreshBankCards: vi.fn(),
}

// Mock des hooks de navigation Next.js
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/edition',
}))

// Mock des services d'upload d'images
vi.mock('@/lib/services/imageUploadService', () => ({
  checkImageQuota: vi.fn().mockResolvedValue({
    canUpload: true,
    stats: { task_images: 2, reward_images: 1 },
    quotas: { max_task_images: 40, max_reward_images: 10 },
  }),
  uploadImageWithQuota: vi.fn().mockResolvedValue({
    filePath: 'test-image.jpg',
    publicUrl: 'http://example.com/test-image.jpg',
  }),
}))

describe('Edition - Test intégration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('✅ affiche la page avec la section Bibliothèque de cartes', async () => {
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
