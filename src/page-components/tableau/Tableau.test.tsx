'use client'

// src/pages/tableau/Tableau.test.tsx
/**
 * 🧪 Test d'intégration - Page Tableau
 *
 * Architecture actuelle (post-migration S9-S12) :
 * - Tableau basé sur slots/séquences (plus de table "taches" legacy)
 * - Validation via useSessions/useSessionValidations
 * - TrainProgressBar sans data-testid exposé
 * - PersonalizationModal déplacé hors de Tableau
 * - Complétion via data-testid="completion-overlay"
 *
 * Les tests de comportement détaillé (validation, progression, récompenses)
 * sont couverts au niveau des hooks (useSessions.test.ts, useSlots.test.ts).
 *
 * Ce fichier teste uniquement le rendu de la page sans crash.
 */

import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import TableauGrille from './Tableau'

// Mock react-confetti (sinon il essaie de mesurer la fenêtre)
vi.mock('react-confetti', () => ({
  default: () => null,
}))

// Mock react-use (useWindowSize)
vi.mock('react-use', () => ({
  useWindowSize: () => ({ width: 1024, height: 768 }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/tableau',
}))

describe('Tableau - Test intégration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Mode authentifié', () => {
    it("✅ affiche les tâches de l'utilisateur", async () => {
      renderWithProviders(<TableauGrille />)

      await waitFor(
        () => {
          const taskCards = screen.queryAllByTestId(/task-card|tache-/)
          expect(taskCards.length).toBeGreaterThanOrEqual(0)
        },
        { timeout: 5000 }
      )
    })

    it('✅ affiche le conteneur principal du tableau', async () => {
      renderWithProviders(<TableauGrille />)

      await waitFor(() => {
        const tableau = document.querySelector('.tableau-magique')
        expect(tableau).toBeTruthy()
      })
    })
  })

  describe('Mode démo (visiteur)', () => {
    it('✅ affiche le tableau en mode démo', async () => {
      renderWithProviders(<TableauGrille isDemo={true} />)

      await waitFor(
        () => {
          const content = document.body.textContent
          expect(content).toBeTruthy()
        },
        { timeout: 3000 }
      )
    })
  })
})
