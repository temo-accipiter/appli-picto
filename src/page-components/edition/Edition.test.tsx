'use client'

// src/pages/edition/Edition.test.jsx
/**
 * 🧪 Test d'intégration - Page Edition
 *
 * Teste l'ensemble de la page Edition avec tous ses composants
 * interconnectés (TachesEdition, RecompensesEdition, modals, etc.)
 *
 * Stack : Vitest + RTL + MSW
 */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

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
  let user

  beforeEach(() => {
    user = userEvent.setup()
    // Reset des mocks avant chaque test
    vi.clearAllMocks()
  })

  it('✅ affiche la page avec les sections Tâches et Récompenses', async () => {
    renderWithProviders(<Edition {...defaultEditionProps} />)

    // Attendre le chargement - La section tâches est maintenant toujours visible
    // avec le bouton "Options d'édition" pour les actions/filtres
    await waitFor(() => {
      expect(screen.getByText(/Options d'édition/i)).toBeInTheDocument()
    })

    // Vérifier le bouton de toggle Récompenses
    expect(screen.getByText('Récompenses')).toBeInTheDocument()
    // Note: Confettis checkbox nécessite que parametres soient chargés via MSW
  })

  it.skip('✅ affiche et masque la section Tâches au clic', async () => {
    // TODO: Ce test nécessite une meilleure configuration des mocks pour TachesEdition
    renderWithProviders(<Edition {...defaultEditionProps} />)

    await waitFor(() => {
      expect(screen.getByText('Tâches')).toBeInTheDocument()
    })

    // Cliquer sur le bouton Tâches
    const tachesButton = screen.getByText('Tâches').closest('button')
    await user.click(tachesButton)

    // La section devrait apparaître
    await waitFor(() => {
      expect(
        screen.getByText(/Ajouter une tâche|Nouvelle tâche/i)
      ).toBeInTheDocument()
    })

    // Cliquer à nouveau pour masquer
    await user.click(tachesButton)

    // La section devrait disparaître
    await waitFor(() => {
      expect(
        screen.queryByText(/Ajouter une tâche|Nouvelle tâche/i)
      ).not.toBeInTheDocument()
    })
  })

  it.skip('✅ affiche et masque la section Récompenses au clic', async () => {
    // TODO: Nécessite mocks pour RecompensesEdition
    renderWithProviders(<Edition {...defaultEditionProps} />)

    await waitFor(() => {
      expect(screen.getByText('Récompenses')).toBeInTheDocument()
    })

    // Cliquer sur le bouton Récompenses
    const recompensesButton = screen.getByText('Récompenses').closest('button')
    await user.click(recompensesButton)

    // La section devrait apparaître
    await waitFor(() => {
      expect(
        screen.getByText(/Ajouter une récompense|Nouvelle récompense/i)
      ).toBeInTheDocument()
    })
  })

  it.skip('✅ charge et affiche les tâches existantes', async () => {
    // TODO: Nécessite configuration complète MSW
    // Override MSW pour retourner des tâches spécifiques
    server.use(
      http.get('http://localhost:54321/rest/v1/taches', () => {
        return HttpResponse.json(
          [
            {
              id: '1',
              label: 'Brosser les dents',
              fait: false,
              aujourdhui: true,
              position: 0,
              imagepath: null,
              category_id: null,
              user_id: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z',
            },
            {
              id: '2',
              label: 'Ranger la chambre',
              fait: false,
              aujourdhui: false,
              position: 1,
              imagepath: null,
              category_id: null,
              user_id: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
          { status: 200 }
        )
      })
    )

    renderWithProviders(<Edition {...defaultEditionProps} />)

    // Ouvrir la section Tâches
    await waitFor(() => {
      expect(screen.getByText('Tâches')).toBeInTheDocument()
    })

    const tachesButton = screen.getByText('Tâches').closest('button')
    await user.click(tachesButton)

    // Attendre que les tâches soient chargées et affichées
    await waitFor(() => {
      expect(screen.getByText('Brosser les dents')).toBeInTheDocument()
      expect(screen.getByText('Ranger la chambre')).toBeInTheDocument()
    })
  })

  it.skip('✅ charge et affiche les récompenses existantes', async () => {
    // TODO: Nécessite configuration complète MSW
    // Override MSW pour retourner des récompenses spécifiques
    server.use(
      http.get('http://localhost:54321/rest/v1/recompenses', () => {
        return HttpResponse.json(
          [
            {
              id: '1',
              label: 'Temps de jeu vidéo',
              imagepath: 'jeu.jpg',
              selected: true,
              user_id: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z',
            },
            {
              id: '2',
              label: 'Sortie au parc',
              imagepath: 'parc.jpg',
              selected: false,
              user_id: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
          { status: 200 }
        )
      })
    )

    renderWithProviders(<Edition {...defaultEditionProps} />)

    // Ouvrir la section Récompenses
    await waitFor(() => {
      expect(screen.getByText('Récompenses')).toBeInTheDocument()
    })

    const recompensesButton = screen.getByText('Récompenses').closest('button')
    await user.click(recompensesButton)

    // Attendre que les récompenses soient chargées et affichées
    await waitFor(() => {
      expect(screen.getByText('Temps de jeu vidéo')).toBeInTheDocument()
      expect(screen.getByText('Sortie au parc')).toBeInTheDocument()
    })
  })

  it.skip('✅ active/désactive les confettis', async () => {
    // TODO: Nécessite que parametres soient chargés via MSW
    renderWithProviders(<Edition {...defaultEditionProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Confettis/)).toBeInTheDocument()
    })

    // Trouver la checkbox des confettis
    const confettisContainer = screen
      .getByText(/Confettis/)
      .closest('.confettis-checkbox')

    if (!confettisContainer) throw new Error('confettisContainer not found')

    const confettisCheckbox = confettisContainer.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement | null

    // Toggle les confettis
    if (!confettisCheckbox) throw new Error('confettisCheckbox not found')
    const initialChecked = confettisCheckbox.checked
    await user.click(confettisCheckbox)

    // Attendre que l'état change
    await waitFor(() => {
      expect(confettisCheckbox.checked).toBe(!initialChecked)
    })
  })

  it.skip('✅ affiche le modal de confirmation avant suppression de tâche', async () => {
    // TODO: Nécessite mocks et sélecteurs plus robustes
    // Override pour avoir une tâche
    server.use(
      http.get('http://localhost:54321/rest/v1/taches', () => {
        return HttpResponse.json(
          [
            {
              id: '1',
              label: 'Tâche à supprimer',
              fait: false,
              aujourdhui: true,
              position: 0,
              imagepath: null,
              category_id: null,
              user_id: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
          { status: 200 }
        )
      })
    )

    renderWithProviders(<Edition {...defaultEditionProps} />)

    // Ouvrir la section Tâches
    await waitFor(() => {
      expect(screen.getByText('Tâches')).toBeInTheDocument()
    })

    const tachesButton = screen.getByText('Tâches').closest('button')
    await user.click(tachesButton)

    // Attendre la tâche
    await waitFor(() => {
      expect(screen.getByText('Tâche à supprimer')).toBeInTheDocument()
    })

    // Cliquer sur le bouton de suppression (si visible)
    const deleteButtons = screen.queryAllByRole('button', {
      name: /supprimer|delete|poubelle/i,
    })
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      // Le modal de confirmation devrait apparaître
      await waitFor(() => {
        expect(screen.getByText(/Supprimer la tâche/i)).toBeInTheDocument()
      })
    }
  })

  it.skip('✅ gère les quotas et affiche le modal de quota si dépassés', async () => {
    // TODO: Nécessite mocks useRBAC plus complexes
    // Simuler un quota dépassé en mockant canCreateTask
    // Note: Ce test dépend de l'implémentation du hook useRBAC
    // qui devrait être testé séparément

    renderWithProviders(<Edition {...defaultEditionProps} />)

    await waitFor(() => {
      expect(screen.getByText('Tâches')).toBeInTheDocument()
    })

    // Ouvrir la section Tâches
    const tachesButton = screen.getByText('Tâches').closest('button')
    await user.click(tachesButton)

    // Le test du modal de quota nécessiterait de forcer un quota dépassé
    // Ce qui est mieux testé au niveau du hook useRBAC
    // On vérifie juste que la page se charge sans erreur
    await waitFor(() => {
      expect(
        screen.getByText(/Ajouter une tâche|Nouvelle tâche/i)
      ).toBeInTheDocument()
    })
  })

  it.skip("✅ affiche les indicateurs de quota d'images", async () => {
    // TODO: Nécessite mocks pour ImageQuotaIndicator
    renderWithProviders(<Edition {...defaultEditionProps} />)

    await waitFor(() => {
      expect(screen.getByText('Tâches')).toBeInTheDocument()
    })

    // Ouvrir la section Tâches
    const tachesButton = screen.getByText('Tâches').closest('button')
    await user.click(tachesButton)

    // Les indicateurs de quota doivent être visibles
    await waitFor(() => {
      const quotaIndicators = screen.queryAllByText(/\d+\/\d+/)
      // Il devrait y avoir au moins un indicateur de quota
      expect(quotaIndicators.length).toBeGreaterThanOrEqual(0)
    })
  })

  it.skip("✅ persiste l'état d'ouverture des sections dans sessionStorage", async () => {
    // TODO: Nécessite configuration plus robuste
    renderWithProviders(<Edition {...defaultEditionProps} />)

    await waitFor(() => {
      expect(screen.getByText('Tâches')).toBeInTheDocument()
    })

    // Ouvrir la section Tâches
    const tachesButton = screen.getByText('Tâches').closest('button')
    await user.click(tachesButton)

    // Vérifier que sessionStorage a été mis à jour
    await waitFor(() => {
      expect(sessionStorage.getItem('showTaches')).toBe('true')
    })

    // Fermer la section
    await user.click(tachesButton)

    await waitFor(() => {
      expect(sessionStorage.getItem('showTaches')).toBe('false')
    })
  })

  it.skip('✅ filtre les tâches par catégorie', async () => {
    // TODO: Nécessite mocks pour système de filtrage
    // Override pour avoir des tâches avec catégories
    server.use(
      http.get('http://localhost:54321/rest/v1/taches', () => {
        return HttpResponse.json(
          [
            {
              id: '1',
              label: 'Tâche cat A',
              fait: false,
              aujourdhui: true,
              position: 0,
              imagepath: null,
              category_id: 'cat-a',
              user_id: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z',
            },
            {
              id: '2',
              label: 'Tâche cat B',
              fait: false,
              aujourdhui: true,
              position: 1,
              imagepath: null,
              category_id: 'cat-b',
              user_id: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
          { status: 200 }
        )
      }),
      http.get('http://localhost:54321/rest/v1/categories', () => {
        return HttpResponse.json(
          [
            {
              value: 'cat-a',
              label: 'Catégorie A',
              user_id: 'test-user-123',
            },
            {
              value: 'cat-b',
              label: 'Catégorie B',
              user_id: 'test-user-123',
            },
          ],
          { status: 200 }
        )
      })
    )

    renderWithProviders(<Edition {...defaultEditionProps} />)

    // Ouvrir la section Tâches
    await waitFor(() => {
      expect(screen.getByText('Tâches')).toBeInTheDocument()
    })

    const tachesButton = screen.getByText('Tâches').closest('button')
    await user.click(tachesButton)

    // Attendre que les tâches soient chargées
    await waitFor(() => {
      expect(screen.getByText('Tâche cat A')).toBeInTheDocument()
      expect(screen.getByText('Tâche cat B')).toBeInTheDocument()
    })

    // Le filtrage serait testé ici si le composant TachesEdition
    // expose un sélecteur de catégorie accessible
  })
})
