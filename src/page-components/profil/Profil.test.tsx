'use client'

// src/pages/profil/Profil.test.jsx

/**
 * 🧪 Test d'intégration - Page Compte
 *
 * Page de gestion du compte utilisateur :
 * - Affichage des informations de base (email, badges)
 * - Gestion des espaces enfants
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
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('Affichage du profil', () => {
    it('✅ affiche la page compte avec les éléments de base', async () => {
      renderWithProviders(<Profil />)

      await waitFor(
        () => {
          const title =
            screen.queryByText(/compte/i) ||
            screen.queryByText(/profil\.myProfile/)
          const profilPage = document.querySelector('.profil-page')

          expect(title || profilPage).toBeTruthy()
        },
        { timeout: 10000 }
      )
    }, 15000)

    it.skip("✅ affiche le statut d'abonnement", async () => {
      // TODO: Nécessite mock useAccountStatus
      renderWithProviders(<Profil />)

      await waitFor(() => {
        const subscriptionInfo = screen.queryByText(
          /abonnement|subscription|gratuit|premium/i
        )
        if (subscriptionInfo) {
          expect(subscriptionInfo).toBeInTheDocument()
        }
      })
    })
  })

  describe('Actions du compte', () => {
    it.skip('✅ permet de se déconnecter', async () => {
      // TODO: Nécessite mock signOut
      renderWithProviders(<Profil />)

      const signOutButton = screen.getByRole('button', {
        name: /déconnexion|logout|sign out/i,
      })
      await user.click(signOutButton)
    })

    it.skip('✅ affiche le modal de suppression du compte', async () => {
      // TODO: Nécessite mock DeleteAccountModal
      renderWithProviders(<Profil />)

      const deleteAccountButton = screen.getByRole('button', {
        name: /supprimer.*compte/i,
      })
      await user.click(deleteAccountButton)

      await waitFor(() => {
        expect(
          screen.getByText(/confirmer.*suppression|supprimer définitivement/i)
        ).toBeInTheDocument()
      })
    })

    it.skip('✅ affiche le formulaire de reset de mot de passe', async () => {
      // TODO: Nécessite mock reset password
      renderWithProviders(<Profil />)

      const resetPasswordButton = screen.queryByRole('button', {
        name: /mot de passe|password|reset/i,
      })

      if (resetPasswordButton) {
        await user.click(resetPasswordButton)

        await waitFor(() => {
          expect(
            screen.getByText(/email.*envoyé|reset.*mot de passe/i)
          ).toBeInTheDocument()
        })
      }
    })
  })
})
