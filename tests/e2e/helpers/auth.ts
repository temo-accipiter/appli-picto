/**
 * 🔐 Helpers d'authentification pour tests E2E Playwright
 *
 * Comptes seed (supabase/seed.sql) :
 *   admin@local.dev       / Admin1234x → statut admin
 *   test-subscriber@local.dev / Test1234x → statut subscriber
 *   test-free@local.dev   / Test1234x → statut free
 *
 * Stratégie login :
 *   On utilise directement window.supabase.auth.signInWithPassword() via page.evaluate().
 *   Cela évite le CAPTCHA Turnstile (non validé par Supabase local de toute façon).
 *   window.supabase est exposé par src/utils/supabaseClient.ts (ligne ~102).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Page, expect } from '@playwright/test'

export interface LoginCredentials {
  email: string
  password: string
}

export interface TestUser {
  email: string
  password: string
  role: 'free' | 'subscriber' | 'admin'
}

/**
 * Comptes de test — créés par supabase/seed.sql après pnpm db:reset
 */
export const TEST_USERS: Record<string, TestUser> = {
  free: {
    email: 'test-free@local.dev',
    password: 'Test1234x',
    role: 'free',
  },
  subscriber: {
    email: 'test-subscriber@local.dev',
    password: 'Test1234x',
    role: 'subscriber',
  },
  admin: {
    email: 'admin@local.dev',
    password: 'Admin1234x',
    role: 'admin',
  },
}

/**
 * Se connecter via l'API Supabase directement (sans UI, sans Turnstile).
 *
 * Méthode :
 *  1. Naviguer vers / pour initialiser le client Supabase
 *  2. Attendre que window.supabase soit disponible
 *  3. Appeler signInWithPassword via page.evaluate (pas de Turnstile requis côté local)
 *  4. Recharger → la session est maintenant active dans localStorage
 *
 * @example
 * await loginAs(page, 'free')
 * await loginAs(page, 'admin')
 */
export async function loginAs(
  page: Page,
  role: keyof typeof TEST_USERS
): Promise<void> {
  const user = TEST_USERS[role]
  if (!user) throw new Error(`Rôle inconnu : "${role}"`)
  await loginViaAPI(page, user)
}

export async function loginViaAPI(
  page: Page,
  credentials: LoginCredentials
): Promise<void> {
  // Naviguer pour charger l'app et initialiser window.supabase
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // Attendre que window.supabase soit exposé par l'app
  await page.waitForFunction(() => !!(window as any).supabase, {
    timeout: 15000,
  })

  // Sign in via Supabase JS client — pas de Turnstile requis en local
  const result = await page.evaluate(
    async ({ email, password }) => {
      const client = (window as any).supabase
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })
      return {
        userId: data?.user?.id ?? null,
        errorMsg: error?.message ?? null,
      }
    },
    { email: credentials.email, password: credentials.password }
  )

  if (result.errorMsg || !result.userId) {
    throw new Error(
      `Login échoué pour ${credentials.email}: ${result.errorMsg ?? 'no user returned'}`
    )
  }

  // Recharger → session active dans localStorage + état React auth initialisé
  await page.reload()
  await page.waitForLoadState('networkidle')
}

/**
 * Se déconnecter via l'API Supabase (sans UI).
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const client = (window as any).supabase
    if (client) await client.auth.signOut()
  })
  await page.reload()
}

/**
 * Vérifier que la page affiche la 404 neutre d'AdminRoute
 * (sans révéler l'existence d'une route admin).
 *
 * Vérifie :
 *  - h1 = "Page non trouvée"
 *  - Aucun texte visible "admin", "forbidden", "permission"
 */
export async function expectNeutral404(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Page non trouvée' })
  ).toBeVisible({ timeout: 8000 })

  // Utiliser innerText (texte visible uniquement, sans les scripts Next.js)
  const visibleText = await page.evaluate(() => document.body.innerText)
  expect(visibleText.toLowerCase()).not.toContain('forbidden')
  expect(visibleText.toLowerCase()).not.toContain('permission')
  expect(visibleText.toLowerCase()).not.toContain('interdit')
  expect(visibleText.toLowerCase()).not.toContain('non autorisé')

  // "admin" ne doit pas apparaître dans le texte visible
  // (peut être présent dans les attributs CSS/classes mais pas le texte)
  const lowerVisible = visibleText.toLowerCase()
  const adminIdx = lowerVisible.indexOf('admin')
  if (adminIdx !== -1) {
    // Extraire le contexte autour du mot trouvé
    const snippet = visibleText.slice(Math.max(0, adminIdx - 20), adminIdx + 30)
    throw new Error(
      `Texte "admin" visible trouvé sur la page 404 neutre : "...${snippet}..."`
    )
  }
}

/**
 * Mock Turnstile CAPTCHA — conservé pour les tests qui en ont besoin
 * (ex: tests du flow login via UI).
 *
 * NOTE: La plupart des tests utilisent loginViaAPI() et n'ont pas besoin de ce mock.
 */
export async function mockTurnstile(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const MOCK_TOKEN = 'mock-turnstile-token-e2e'
    ;(window as any).turnstile = {
      ready: (cb: () => void) => setTimeout(cb, 10),
      render: (_el: HTMLElement, options: Record<string, unknown>) => {
        const cb =
          (options.callback as ((t: string) => void) | undefined) ||
          (options.onSuccess as ((t: string) => void) | undefined)
        if (typeof cb === 'function') setTimeout(() => cb(MOCK_TOKEN), 100)
        return 'mock-widget-id'
      },
      reset: () => {},
      remove: () => {},
      getResponse: () => MOCK_TOKEN,
      isExpired: () => false,
    }
  })
  await page.route('**/challenges.cloudflare.com/**', route => route.abort())
  await page.route('**/cloudflare.com/turnstile/**', route => route.abort())
}
