// src/hooks/useTaches.msw.test.js
/**
 * ✨ Exemple de test avec MSW (Mock Service Worker)
 *
 * Ce test montre la nouvelle approche avec MSW :
 * ✅ Pas de mock manuel Supabase
 * ✅ Requêtes HTTP réelles interceptées
 * ✅ Plus réaliste et maintenable
 *
 * Compare avec useTaches.test.js (ancienne approche)
 */

import { waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHookWithProviders } from '@/test/test-utils'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'
import { mockTaches } from '@/test/mocks/data'

// Import réel du hook (pas de mock nécessaire !)
import useTaches from './useTaches'

// Mock deleteImageIfAny
vi.mock('@/utils/storage/deleteImageIfAny', () => ({
  default: vi.fn(() => Promise.resolve({ deleted: true, error: null })),
}))

describe.skip('useTaches (avec MSW)', () => {
  // TODO: Ces tests nécessitent de mocker l'URL Supabase pour MSW
  // Les vrais providers utilisent l'URL réelle, pas localhost:54321

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.skip('✅ doit charger les tâches via MSW', async () => {
    // Arrange - MSW s'occupe des mocks HTTP automatiquement
    // Les handlers dans src/test/mocks/handlers.js gèrent la réponse

    // Act
    const { result } = renderHookWithProviders(() => useTaches())

    // Assert
    await waitFor(
      () => {
        expect(result.current.taches).toHaveLength(3)
        expect(result.current.taches[0]?.label).toBe('Brosser les dents')
      },
      { timeout: 3000 }
    )
  })

  it.skip('✅ doit gérer les erreurs réseau', async () => {
    // Arrange - Override handler pour cette requête spécifique
    server.use(
      http.get('http://localhost:54321/rest/v1/taches', () => {
        return HttpResponse.json(
          { message: 'Network error', code: 'PGRST301' },
          { status: 500 }
        )
      })
    )

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    // Act
    const { result } = renderHookWithProviders(() => useTaches())

    // Assert
    await waitFor(() => {
      expect(result.current.taches).toEqual([])
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it.skip("✅ doit retourner seulement les tâches de l'utilisateur", async () => {
    // Arrange - Ajouter tâches d'un autre user
    server.use(
      http.get('http://localhost:54321/rest/v1/taches', ({ request }) => {
        const url = new URL(request.url)
        const userId = url.searchParams.get('user_id')?.replace('eq.', '')

        if (userId === 'test-user-123') {
          return HttpResponse.json(
            [
              mockTaches[0], // Tâche de test-user-123
              mockTaches[1],
            ],
            { status: 200 }
          )
        }

        return HttpResponse.json([], { status: 200 })
      })
    )

    // Act
    const { result } = renderHookWithProviders(() => useTaches())

    // Assert
    await waitFor(() => {
      expect(result.current.taches).toHaveLength(2)
      expect(
        result.current.taches.every(t => t.user_id === 'test-user-123')
      ).toBe(true)
    })
  })

  it.skip('✅ doit normaliser les booléens', async () => {
    // Arrange - Override avec des valeurs truthy/falsy
    server.use(
      http.get('http://localhost:54321/rest/v1/taches', () => {
        return HttpResponse.json(
          [
            {
              id: '1',
              label: 'Test',
              fait: 1, // truthy
              aujourdhui: 0, // falsy
              position: 0,
              user_id: 'test-user-123',
            },
          ],
          { status: 200 }
        )
      })
    )

    // Act
    const { result } = renderHookWithProviders(() => useTaches())

    // Assert
    await waitFor(() => {
      expect(result.current.taches[0]?.fait).toBe(true) // 1 → true
      expect(result.current.taches[0]?.aujourdhui).toBe(false) // 0 → false
    })
  })
})
