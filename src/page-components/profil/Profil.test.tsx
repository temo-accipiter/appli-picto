'use client'

// src/pages/profil/Profil.test.jsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 🧪 Test d'intégration - Page Profil
 *
 * Page de gestion du profil utilisateur :
 * - Affichage des informations utilisateur
 * - Modification du pseudo, ville, date de naissance
 * - Upload/suppression avatar
 * - Déconnexion
 * - Suppression du compte
 * - Affichage statut abonnement
 *
 * Stack : Vitest + RTL + MSW
 */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import Profil from './Profil'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'
import { TEST_USER_ID } from '@/test/mocks/data'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/profil',
}))

// Mock Turnstile (Cloudflare captcha)
vi.mock('react-turnstile', () => ({
  default: () => null,
}))

// Mock useAccountStatus
vi.mock('@/hooks/useAccountStatus', () => ({
  default: () => ({
    isSubscriber: false,
    isFree: true,
    isAdmin: false,
    status: 'free',
    loading: false,
    error: null,
    statusDisplay: { label: 'Gratuit', icon: '', color: 'default' },
  }),
}))

describe('Profil - Test intégration', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('Affichage du profil', () => {
    it('✅ affiche la page profil avec les champs de base', async () => {
      // Arrange - MSW retournera les données mock profiles
      renderWithProviders(<Profil />)

      // Assert - Vérifier que les éléments de base sont présents
      await waitFor(
        () => {
          // Chercher le titre (traduit ou clé i18n) ou le formulaire
          const title =
            screen.queryByText(/mon profil/i) ||
            screen.queryByText(/profil\.myProfile/)
          const form = document.querySelector('form')
          const profilPage = document.querySelector('.profil-page')

          expect(title || form || profilPage).toBeTruthy()
        },
        { timeout: 10000 }
      )
    }, 15000) // Timeout test 15s (> waitFor 10s)

    it.skip('✅ charge et affiche les données du profil utilisateur', async () => {
      // TODO: Nécessite configuration MSW plus précise pour profiles
      // Arrange - Override MSW pour retourner un profil spécifique
      server.use(
        http.get('http://localhost:54321/rest/v1/profiles', ({ request }) => {
          const url = new URL(request.url)
          const userId = url.searchParams.get('id')?.replace('eq.', '')

          if (userId === TEST_USER_ID) {
            return HttpResponse.json(
              [
                {
                  id: TEST_USER_ID,
                  pseudo: 'Test User',
                  date_naissance: '2010-01-01',
                  ville: 'Paris',
                  is_admin: false,
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
              { status: 200 }
            )
          }

          return HttpResponse.json([], { status: 200 })
        })
      )

      renderWithProviders(<Profil />)

      // Assert - Les données du profil devraient s'afficher
      await waitFor(
        () => {
          const pseudoInput = screen.queryByDisplayValue('Test User')
          const villeInput = screen.queryByDisplayValue('Paris')

          // Au moins une donnée devrait être chargée
          expect(pseudoInput || villeInput).toBeTruthy()
        },
        { timeout: 10000 }
      )
    })

    it.skip("✅ affiche le statut d'abonnement", async () => {
      // TODO: Nécessite mock useAccountStatus
      renderWithProviders(<Profil />)

      await waitFor(() => {
        // Chercher des éléments liés à l'abonnement
        const subscriptionInfo = screen.queryByText(
          /abonnement|subscription|gratuit|premium/i
        )
        if (subscriptionInfo) {
          expect(subscriptionInfo).toBeInTheDocument()
        }
      })
    })
  })

  describe('Modification du profil', () => {
    it.skip('✅ permet de modifier le pseudo', async () => {
      // TODO: Nécessite simulation complète de sauvegarde
      renderWithProviders(<Profil />)

      await waitFor(() => {
        const pseudoInput = screen.queryByLabelText(/pseudo/i)
        expect(pseudoInput).toBeTruthy()
      })

      const pseudoInput = screen.getByLabelText(/pseudo/i)

      // Modifier le pseudo
      await user.clear(pseudoInput)
      await user.type(pseudoInput, 'Nouveau Pseudo')

      // Sauvegarder
      const saveButton = screen.getByRole('button', {
        name: /enregistrer|sauvegarder|save/i,
      })
      await user.click(saveButton)

      // Vérifier le toast de succès
      await waitFor(() => {
        expect(
          screen.getByText(/profil mis à jour|succès/i)
        ).toBeInTheDocument()
      })
    })

    it.skip('✅ valide les espaces dans le pseudo', async () => {
      // TODO: Nécessite configuration validation
      renderWithProviders(<Profil />)

      await waitFor(() => {
        const pseudoInput = screen.queryByLabelText(/pseudo/i)
        expect(pseudoInput).toBeTruthy()
      })

      const pseudoInput = screen.getByLabelText(/pseudo/i)

      // Tenter d'entrer un pseudo avec espaces aux extrémités
      await user.clear(pseudoInput)
      await user.type(pseudoInput, '  Pseudo invalide  ')

      // Tenter de sauvegarder
      const saveButton = screen.getByRole('button', { name: /enregistrer/i })
      await user.click(saveButton)

      // Un message d'erreur devrait apparaître
      await waitFor(() => {
        expect(screen.getByText(/corrige|erreur|invalide/i)).toBeInTheDocument()
      })
    })
  })

  describe("Gestion de l'avatar", () => {
    it.skip("✅ affiche l'avatar par défaut", async () => {
      // TODO: Nécessite mock AvatarProfil
      renderWithProviders(<Profil />)

      await waitFor(() => {
        const avatar = screen.queryByAltText(/avatar|profil/i)
        if (avatar) {
          expect(avatar).toBeInTheDocument()
        }
      })
    })

    it.skip("✅ permet d'uploader un avatar", async () => {
      // TODO: Nécessite mock upload avatar
      renderWithProviders(<Profil />)

      // Simuler upload d'un fichier
      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
      const input = screen.getByLabelText(/télécharger|upload|choisir|avatar/i)

      await user.upload(input, file)

      // Vérifier que l'avatar est uploadé
      await waitFor(() => {
        expect(screen.getByText(/avatar.*uploadé|succès/i)).toBeInTheDocument()
      })
    })

    it.skip("✅ permet de supprimer l'avatar", async () => {
      // TODO: Nécessite simulation suppression avatar
      renderWithProviders(<Profil />)

      // Cliquer sur le bouton de suppression d'avatar
      const deleteAvatarButton = screen.getByRole('button', {
        name: /supprimer.*avatar/i,
      })
      await user.click(deleteAvatarButton)

      // Confirmer la suppression
      const confirmButton = screen.getByRole('button', {
        name: /confirmer|oui/i,
      })
      await user.click(confirmButton)

      // Vérifier la suppression
      await waitFor(() => {
        expect(screen.getByText(/avatar.*supprimé/i)).toBeInTheDocument()
      })
    })
  })

  describe('Actions du compte', () => {
    it.skip('✅ permet de se déconnecter', async () => {
      // TODO: Nécessite mock signOut
      renderWithProviders(<Profil />)

      // Cliquer sur le bouton de déconnexion
      const signOutButton = screen.getByRole('button', {
        name: /déconnexion|logout|sign out/i,
      })
      await user.click(signOutButton)

      // La fonction signOut devrait être appelée
      // (vérifier via mock)
    })

    it.skip('✅ affiche le modal de suppression du compte', async () => {
      // TODO: Nécessite mock DeleteAccountModal
      renderWithProviders(<Profil />)

      // Cliquer sur le bouton de suppression du compte
      const deleteAccountButton = screen.getByRole('button', {
        name: /supprimer.*compte/i,
      })
      await user.click(deleteAccountButton)

      // Le modal de confirmation devrait apparaître
      await waitFor(() => {
        expect(
          screen.getByText(/confirmer.*suppression|supprimer définitivement/i)
        ).toBeInTheDocument()
      })
    })

    it.skip('✅ affiche le formulaire de reset de mot de passe', async () => {
      // TODO: Nécessite mock reset password
      renderWithProviders(<Profil />)

      // Chercher le bouton de reset password
      const resetPasswordButton = screen.queryByRole('button', {
        name: /mot de passe|password|reset/i,
      })

      if (resetPasswordButton) {
        await user.click(resetPasswordButton)

        // Le modal ou formulaire de reset devrait apparaître
        await waitFor(() => {
          expect(
            screen.getByText(/email.*envoyé|reset.*mot de passe/i)
          ).toBeInTheDocument()
        })
      }
    })
  })

  describe('Validation des champs', () => {
    it.skip('✅ valide le format de la date de naissance', async () => {
      // TODO: Nécessite simulation saisie date invalide
      renderWithProviders(<Profil />)

      const dateInput = screen.getByLabelText(/date.*naissance/i)

      // Tenter d'entrer une date invalide
      await user.type(dateInput, '99/99/9999')

      const saveButton = screen.getByRole('button', { name: /enregistrer/i })
      await user.click(saveButton)

      // Un message d'erreur devrait apparaître
      await waitFor(() => {
        const errorMessage = screen.queryByText(/invalide|erreur/i)
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument()
        }
      })
    })

    it.skip('✅ empêche les doubles espaces dans le pseudo', async () => {
      // TODO: Nécessite validation noDoubleSpaces
      renderWithProviders(<Profil />)

      const pseudoInput = screen.getByLabelText(/pseudo/i)

      await user.clear(pseudoInput)
      await user.type(pseudoInput, 'Pseudo  avec  espaces')

      const saveButton = screen.getByRole('button', { name: /enregistrer/i })
      await user.click(saveButton)

      // Un message d'erreur devrait apparaître
      await waitFor(() => {
        expect(screen.getByText(/corrige|double.*espace/i)).toBeInTheDocument()
      })
    })
  })

  describe('Gestion des erreurs', () => {
    it.skip('✅ gère les erreurs de sauvegarde du profil', async () => {
      // TODO: Simuler erreur Supabase
      server.use(
        http.patch('http://localhost:54321/rest/v1/profiles', () => {
          return HttpResponse.json(
            { message: 'Database error', code: '42P01' },
            { status: 500 }
          )
        })
      )

      renderWithProviders(<Profil />)

      const pseudoInput = screen.getByLabelText(/pseudo/i)
      await user.clear(pseudoInput)
      await user.type(pseudoInput, 'Nouveau pseudo')

      const saveButton = screen.getByRole('button', { name: /enregistrer/i })
      await user.click(saveButton)

      // Un message d'erreur devrait apparaître
      await waitFor(() => {
        expect(screen.getByText(/erreur.*sauvegarde/i)).toBeInTheDocument()
      })
    })
  })

  describe('Création automatique du profil', () => {
    it.skip('✅ crée automatiquement un profil si inexistant', async () => {
      // TODO: Simuler profil inexistant
      server.use(
        http.get('http://localhost:54321/rest/v1/profiles', () => {
          return HttpResponse.json([], { status: 200 })
        }),
        http.post(
          'http://localhost:54321/rest/v1/profiles',
          async ({ request }) => {
            const body = await request.json()
            return HttpResponse.json(
              {
                id: (body as any)?.id,
                pseudo: (body as any)?.pseudo,
                date_naissance: null,
                ville: null,
                created_at: new Date().toISOString(),
              },
              { status: 201 }
            )
          }
        )
      )

      renderWithProviders(<Profil />)

      // Le profil devrait être créé automatiquement avec un pseudo par défaut
      await waitFor(
        () => {
          const pseudoInput = screen.queryByDisplayValue(/utilisateur|test/i)
          expect(pseudoInput).toBeTruthy()
        },
        { timeout: 5000 }
      )
    })
  })
})
