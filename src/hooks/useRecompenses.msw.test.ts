// src/hooks/useRecompenses.msw.test.js
/**
 * ✨ Tests useRecompenses avec MSW (Mock Service Worker)
 *
 * Avantages MSW vs mocks manuels :
 * ✅ Pas de chaînage mockReturnValue complexe
 * ✅ Requêtes HTTP réelles interceptées
 * ✅ Plus proche du comportement production
 * ✅ Plus facile à maintenir
 *
 * Compare avec useRecompenses.test.js (ancienne approche)
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'
import { mockRecompenses, TEST_USER_ID } from '@/test/mocks/data'

// Import réel du hook
import useRecompenses from './useRecompenses'

// Mocks simples des contexts
const mockUser = { id: TEST_USER_ID }
const mockToast = { show: vi.fn() }

vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: () => ({ user: mockUser }),
    useToast: () => mockToast,
  }
})

vi.mock('@/utils/storage/deleteImageIfAny', () => ({
  default: vi.fn(() => Promise.resolve({ deleted: true, error: null })),
}))

describe.skip('useRecompenses (avec MSW)', () => {
  // TODO: Ces tests nécessitent renderWithProviders pour fonctionner correctement
  // Ils démontrent la migration vers MSW mais nécessitent plus de configuration

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Chargement des récompenses', () => {
    it('✅ doit charger les récompenses via MSW', async () => {
      // Arrange - MSW gère automatiquement la réponse
      // (voir src/test/mocks/handlers.js)

      // Act
      const { result } = renderHook(() => useRecompenses())

      // Assert
      await waitFor(
        () => {
          expect(result.current.recompenses).toHaveLength(2)
          expect(result.current.recompenses[0].label).toBe('Temps de jeu vidéo')
          expect(result.current.recompenses[1].label).toBe('Sortie au parc')
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )
    })

    it('✅ doit gérer les erreurs réseau', async () => {
      // Arrange - Override handler pour simuler une erreur
      server.use(
        http.get('http://localhost:54321/rest/v1/recompenses', () => {
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
      const { result } = renderHook(() => useRecompenses())

      // Assert
      await waitFor(() => {
        expect(result.current.recompenses).toEqual([])
        expect(consoleErrorSpy).toHaveBeenCalled()
      })

      consoleErrorSpy.mockRestore()
    })

    it("✅ doit retourner seulement les récompenses de l'utilisateur", async () => {
      // Arrange - Override pour filtrer par user_id
      server.use(
        http.get(
          'http://localhost:54321/rest/v1/recompenses',
          ({ request }) => {
            const url = new URL(request.url)
            const userId = url.searchParams.get('user_id')?.replace('eq.', '')

            if (userId === TEST_USER_ID) {
              return HttpResponse.json(
                [mockRecompenses[0], mockRecompenses[1]],
                { status: 200 }
              )
            }

            return HttpResponse.json([], { status: 200 })
          }
        )
      )

      // Act
      const { result } = renderHook(() => useRecompenses())

      // Assert
      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(2)
        expect(
          result.current.recompenses.every(r => r.user_id === TEST_USER_ID)
        ).toBe(true)
      })
    })
  })

  describe('Sélection de récompense', () => {
    it('✅ doit sélectionner une récompense et désélectionner les autres', async () => {
      // Arrange
      const { result } = renderHook(() => useRecompenses())

      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(2)
      })

      // Mock update pour selectRecompense
      server.use(
        http.patch(
          'http://localhost:54321/rest/v1/recompenses',
          async ({ request }) => {
            const body = await request.json()
            return HttpResponse.json(
              [{ ...mockRecompenses[0], selected: body.selected }],
              { status: 200 }
            )
          }
        )
      )

      // Act - Sélectionner la première récompense
      await act(async () => {
        await result.current.selectRecompense('1')
      })

      // Assert
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith(
          expect.stringContaining('sélectionnée'),
          'success'
        )
      })
    })

    it('✅ doit désélectionner toutes les récompenses', async () => {
      // Arrange
      const { result } = renderHook(() => useRecompenses())

      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(2)
      })

      server.use(
        http.patch('http://localhost:54321/rest/v1/recompenses', () => {
          return HttpResponse.json(
            mockRecompenses.map(r => ({ ...r, selected: false })),
            { status: 200 }
          )
        })
      )

      // Act
      await act(async () => {
        await result.current.deselectAll()
      })

      // Assert
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith(
          expect.stringContaining('désélectionnée'),
          'success'
        )
      })
    })
  })

  describe('Création de récompense', () => {
    it('✅ doit créer une nouvelle récompense', async () => {
      // Arrange
      const { result } = renderHook(() => useRecompenses())

      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(2)
      })

      const newRecompense = {
        label: 'Nouvelle récompense',
        image: 'new-reward.jpg',
      }

      server.use(
        http.post(
          'http://localhost:54321/rest/v1/recompenses',
          async ({ request }) => {
            const body = await request.json()
            return HttpResponse.json(
              [
                {
                  id: '3',
                  label: body.label,
                  imagepath: body.imagepath,
                  selected: false,
                  user_id: TEST_USER_ID,
                  created_at: new Date().toISOString(),
                },
              ],
              { status: 201 }
            )
          }
        )
      )

      // Act
      await act(async () => {
        await result.current.createRecompense(newRecompense)
      })

      // Assert
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith(
          expect.stringContaining('ajoutée'),
          'success'
        )
      })
    })
  })

  describe('Suppression de récompense', () => {
    it('✅ doit supprimer une récompense', async () => {
      // Arrange
      const { result } = renderHook(() => useRecompenses())

      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(2)
      })

      server.use(
        http.delete('http://localhost:54321/rest/v1/recompenses', () => {
          return HttpResponse.json(null, { status: 204 })
        })
      )

      // Act
      await act(async () => {
        await result.current.deleteRecompense('1')
      })

      // Assert
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith(
          expect.stringContaining('supprimée'),
          'success'
        )
      })
    })
  })

  describe('Mise à jour du label', () => {
    it("✅ doit mettre à jour le label d'une récompense", async () => {
      // Arrange
      const { result } = renderHook(() => useRecompenses())

      await waitFor(() => {
        expect(result.current.recompenses).toHaveLength(2)
      })

      server.use(
        http.patch(
          'http://localhost:54321/rest/v1/recompenses',
          async ({ request }) => {
            const body = await request.json()
            return HttpResponse.json(
              [{ ...mockRecompenses[0], label: body.label }],
              { status: 200 }
            )
          }
        )
      )

      // Act
      await act(async () => {
        await result.current.updateLabel('1', 'Nouveau label')
      })

      // Assert
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith(
          expect.stringContaining('modifiée'),
          'success'
        )
      })
    })
  })
})
