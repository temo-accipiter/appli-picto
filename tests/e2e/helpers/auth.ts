/**
 * 🔐 Helpers d'authentification pour tests E2E Playwright
 *
 * Fournit des utilitaires pour gérer l'authentification dans les tests E2E.
 */

import { Page, expect } from '@playwright/test'

export interface LoginCredentials {
  email: string
  password: string
}

export interface TestUser {
  email: string
  password: string
  role: 'free' | 'abonne' | 'admin' | 'visiteur'
}

/**
 * Utilisateurs de test prédéfinis
 */
export const TEST_USERS: Record<string, TestUser> = {
  free: {
    email: 'test-free@appli-picto.test',
    password: 'TestPassword123!',
    role: 'free',
  },
  abonne: {
    email: 'test-abonne@appli-picto.test',
    password: 'TestPassword123!',
    role: 'abonne',
  },
  admin: {
    email: 'test-admin@appli-picto.test',
    password: 'TestPassword123!',
    role: 'admin',
  },
}

/**
 * Se connecter avec email et mot de passe
 *
 * @param page - Page Playwright
 * @param credentials - Identifiants de connexion
 * @param waitForRedirect - Attendre la redirection après connexion (défaut: true)
 *
 * @example
 * await login(page, TEST_USERS.free)
 */
export async function login(
  page: Page,
  credentials: LoginCredentials,
  waitForRedirect = true
): Promise<void> {
  // Naviguer vers la page de connexion
  await page.goto('/connexion')

  // Remplir le formulaire
  await page.getByLabel(/email|e-mail/i).fill(credentials.email)
  await page.getByLabel(/mot de passe|password/i).fill(credentials.password)

  // Soumettre le formulaire
  await page
    .getByRole('button', { name: /se connecter|connexion|login/i })
    .click()

  if (waitForRedirect) {
    // Attendre la redirection (généralement vers /tableau ou /edition)
    await page.waitForURL(/\/(tableau|edition|profil)/, { timeout: 10000 })
  }

  // Vérifier que l'utilisateur est connecté
  await expect(page.getByText(credentials.email)).toBeVisible({ timeout: 5000 })
}

/**
 * Se connecter en tant qu'utilisateur de test spécifique
 *
 * @param page - Page Playwright
 * @param userRole - Rôle de l'utilisateur ('free', 'abonne', 'admin')
 *
 * @example
 * await loginAs(page, 'abonne')
 */
export async function loginAs(
  page: Page,
  userRole: keyof typeof TEST_USERS
): Promise<void> {
  const user = TEST_USERS[userRole]
  if (!user) {
    throw new Error(`User role "${userRole}" not found in TEST_USERS`)
  }
  await login(page, user)
}

/**
 * Se déconnecter
 *
 * @param page - Page Playwright
 *
 * @example
 * await logout(page)
 */
export async function logout(page: Page): Promise<void> {
  // Chercher le bouton de déconnexion (peut être dans un menu)
  const logoutButton = page.getByRole('button', {
    name: /déconnexion|logout|sign out/i,
  })

  // Si le bouton n'est pas visible, essayer d'ouvrir le menu utilisateur
  if (!(await logoutButton.isVisible())) {
    const userMenu = page.getByRole('button', {
      name: /profil|compte|account|menu/i,
    })
    if (await userMenu.isVisible()) {
      await userMenu.click()
    }
  }

  // Cliquer sur le bouton de déconnexion
  await logoutButton.click()

  // Attendre la redirection vers la page de connexion ou d'accueil
  await page.waitForURL(/\/(connexion|accueil|$)/, { timeout: 10000 })
}

/**
 * Vérifier que l'utilisateur est connecté
 *
 * @param page - Page Playwright
 *
 * @example
 * await expectToBeLoggedIn(page)
 */
export async function expectToBeLoggedIn(page: Page): Promise<void> {
  // Vérifier qu'on n'est pas sur la page de connexion
  await expect(page).not.toHaveURL(/\/connexion/)

  // Vérifier qu'un élément caractéristique d'un utilisateur connecté est présent
  // (peut varier selon l'application)
  const userIndicator = page.locator(
    '[data-testid="user-menu"], [aria-label*="profil" i]'
  )
  await expect(userIndicator).toBeVisible({ timeout: 5000 })
}

/**
 * Vérifier que l'utilisateur n'est pas connecté
 *
 * @param page - Page Playwright
 *
 * @example
 * await expectToBeLoggedOut(page)
 */
export async function expectToBeLoggedOut(page: Page): Promise<void> {
  // Vérifier qu'on est sur la page de connexion ou d'accueil
  await expect(page).toHaveURL(/\/(connexion|accueil|$)/)
}

/**
 * Se connecter via l'API Supabase (plus rapide que via UI)
 *
 * Cette méthode est plus rapide car elle utilise directement l'API Supabase
 * au lieu de passer par l'interface utilisateur.
 *
 * @param page - Page Playwright
 * @param credentials - Identifiants de connexion
 *
 * @example
 * await loginViaAPI(page, TEST_USERS.free)
 */
export async function loginViaAPI(
  page: Page,
  credentials: LoginCredentials
): Promise<void> {
  // Injecter un script pour se connecter via l'API Supabase
  await page.goto('/')

  await page.evaluate(async ({ email, password }) => {
    // Utiliser le client Supabase global (si disponible)
    const { supabase } = window as any

    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(`Login failed: ${error.message}`)
    }

    return data
  }, credentials)

  // Attendre que l'authentification soit effective
  await page.waitForTimeout(1000)

  // Recharger la page pour que l'état d'authentification soit pris en compte
  await page.reload()
}

/**
 * Naviguer vers une page en mode visiteur (sans authentification)
 *
 * @param page - Page Playwright
 *
 * @example
 * await visitAsGuest(page)
 */
export async function visitAsGuest(page: Page): Promise<void> {
  // S'assurer qu'on est déconnecté
  await page.goto('/')

  // Effacer le localStorage et les cookies pour être sûr
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  await page.context().clearCookies()
}
