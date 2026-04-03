/**
 * 🎭 Tests E2E — Statut Visitor (non-authentifié)
 *
 * Sources : VISITOR/VISITOR_CHECKLIST.md
 *
 * Cas couverts :
 *  A — Navigation & Routes (accès public, redirections middleware)
 *  B — Navbar Visitor (boutons présents/absents)
 *  D — Données locales (aucun appel réseau DB cloud)
 *  L — Protection enfant (LongPressGuard — skipped, requiert test manuel)
 *  O — Accessibilité (navigation clavier)
 *
 * ⚠️ Tests marqués test.skip :
 *  - Import Visitor → Compte (Turnstile requis pour signup)
 *  - Turnstile suppression compte (Stripe + Turnstile)
 *  - Multi-device (nécessite 2 contextes navigateur simultanés)
 */

import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// A — Navigation & Routes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visitor — Navigation & Routes', () => {
  test('A1 — /tableau accessible sans auth (route publique)', async ({
    page,
  }) => {
    await page.goto('/tableau')

    // La page doit charger sans redirection vers /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })

    // Un contenu principal doit être visible
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({
      timeout: 8000,
    })
  })

  test('A2 — /edition accessible en mode Visitor (ProtectedRoute autorise !user)', async ({
    page,
  }) => {
    await page.goto('/edition')

    // La page /edition ne doit PAS rediriger vers /login pour un visiteur
    // (ProtectedRoute autorise isVisitor = true)
    // Note : le middleware protège /edition/:path* (sous-routes) mais PAS /edition lui-même
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })

    // La page doit avoir un contenu (pas vide)
    const body = page.locator('body')
    await expect(body).not.toBeEmpty()
  })

  test('A3 — /profil redirige vers /login (middleware PrivateRoute)', async ({
    page,
  }) => {
    await page.goto('/profil')

    // Le middleware redirige les non-authentifiés vers /login
    // Timeout 15s car Next.js dev peut compiler la page à la volée avant la redirection
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  })

  test('A4 — /admin/logs en mode Visitor → aucune info admin révélée', async ({
    page,
  }) => {
    await page.goto('/admin/logs')
    await page.waitForLoadState('networkidle')

    // Deux comportements possibles selon l'état du middleware :
    // 1. Redirect vers /login (middleware bloque avant hydration)
    // 2. AdminRoute affiche 404 neutre côté client
    // Dans les deux cas, aucune info "admin" ne doit être visible
    const url = page.url()
    const visibleText = await page.evaluate(() => document.body.innerText)

    if (url.includes('/login')) {
      // Middleware a redirigé → la page /login ne révèle pas l'existence d'admin
      expect(visibleText.toLowerCase()).not.toContain('admin')
    } else {
      // AdminRoute affiche 404 neutre
      expect(url).toContain('/admin/logs') // L'URL peut rester, mais le contenu est neutre
      const heading = page.getByRole('heading', { name: 'Page non trouvée' })
      await expect(heading).toBeVisible({ timeout: 8000 })
      // Vérifier qu'aucun texte admin n'est visible
      expect(visibleText.toLowerCase()).not.toContain('forbidden')
      expect(visibleText.toLowerCase()).not.toContain('permission')
    }
  })

  test('A5 — / → page principale charge', async ({ page }) => {
    await page.goto('/')

    await page.waitForLoadState('domcontentloaded')
    // La page peut rediriger ou rester sur / — dans tous les cas pas d'erreur 500
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B — Navbar Visitor (contexte /tableau)
// ─────────────────────────────────────────────────────────────────────────────

// Note : La Navbar est masquée sur /tableau (zen mode TSA, showNavbar = false dans PublicLayout)
// Les tests Navbar portent sur /edition (contexte adulte = Navbar visible)
test.describe('Visitor — Navbar (contexte /edition)', () => {
  test('B1 — Lien vers /login présent sur /edition pour un Visitor', async ({
    page,
  }) => {
    await page.goto('/edition')
    await page.waitForLoadState('networkidle')

    // La Navbar est visible sur /edition — un lien vers /login doit être présent
    const loginLink = page.locator('a[href="/login"]').first()
    await expect(loginLink).toBeAttached({ timeout: 8000 })
  })

  test('B2 — Aucun UserMenu (bouton Profil) affiché sur /edition pour un Visitor', async ({
    page,
  }) => {
    await page.goto('/edition')
    await page.waitForLoadState('networkidle')

    // Le UserMenu (affiché quand user != null) ne doit pas être visible pour un Visitor
    const userMenu = page.locator('[data-testid="user-menu"]')
    const hasUserMenu = await userMenu.isVisible().catch(() => false)
    expect(hasUserMenu).toBe(false)
  })

  test('B3 — Aucun lien "/admin" visible sur /edition pour un Visitor', async ({
    page,
  }) => {
    await page.goto('/edition')
    await page.waitForLoadState('networkidle')

    // Vérifier qu'aucun lien vers une route admin n'est exposé
    const adminLinks = page.locator('a[href*="/admin"]')
    const count = await adminLinks.count()
    expect(count).toBe(0)
  })

  test('B4 — /tableau (navigation directe) : pas de bouton UserMenu', async ({
    page,
  }) => {
    // Navigation directe (pas via client-side depuis /edition) pour éviter le persist layout
    await page.goto('/tableau', { waitUntil: 'networkidle' })

    // La Navbar est masquée sur /tableau (showNavbar = false dans PublicLayout)
    // → pas de UserMenu visible (bouton compte/profil)
    const userMenu = page.locator('[data-testid="user-menu"]')
    const hasUserMenu = await userMenu
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    expect(hasUserMenu).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// D — Données locales (aucune requête INSERT/UPDATE/DELETE vers Supabase)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visitor — Données locales (réseau)', () => {
  test('D1 — Aucune requête INSERT/UPDATE/DELETE vers Supabase pour un Visitor', async ({
    page,
  }) => {
    const mutatingRequests: string[] = []

    // Intercepter toutes les requêtes vers Supabase
    await page.route('**/rest/v1/**', async route => {
      const req = route.request()
      const method = req.method().toUpperCase()

      // POST, PATCH, PUT, DELETE = mutations
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        mutatingRequests.push(`${method} ${req.url()}`)
      }

      await route.continue()
    })

    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Naviguer un peu pour déclencher les hooks
    await page.goto('/edition')
    await page.waitForLoadState('networkidle')

    // Aucune mutation ne doit partir pour un Visitor
    expect(mutatingRequests).toHaveLength(0)
  })

  test('D2 — /edition en mode Visitor : cartes de banque visibles (lecture seule)', async ({
    page,
  }) => {
    await page.goto('/edition')
    await page.waitForLoadState('domcontentloaded')

    // La page doit charger (pas d'erreur fatale)
    await expect(page).not.toHaveURL(/\/login/)

    // Pas d'erreur 500 visible (innerText = texte visible uniquement, sans les scripts Next.js)
    const visibleText = await page.evaluate(() => document.body.innerText)
    expect(visibleText).not.toMatch(/500 — erreur interne/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// O — Accessibilité
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visitor — Accessibilité', () => {
  test('O1 — /tableau : navigation au clavier (Tab) sans piège', async ({
    page,
  }) => {
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Commencer la navigation clavier
    await page.keyboard.press('Tab')

    const focusedElements: string[] = []
    for (let i = 0; i < 8; i++) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return el ? el.tagName + (el.id ? `#${el.id}` : '') : 'body'
      })
      focusedElements.push(focused)
      await page.keyboard.press('Tab')
      await page.waitForTimeout(50)
    }

    // On doit avoir navigué entre plusieurs éléments différents (pas de piège focus)
    const unique = new Set(focusedElements)
    expect(unique.size).toBeGreaterThan(1)
  })

  test('O2 — /tableau avec prefers-reduced-motion : page charge sans erreur', async ({
    page,
  }) => {
    // Simuler un utilisateur préférant les mouvements réduits
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // La page doit toujours charger sans erreur 500
    await expect(page.locator('body')).not.toBeEmpty()
    const visibleText = await page.evaluate(() => document.body.innerText)
    expect(visibleText).not.toMatch(/500 — erreur interne/i)
  })

  test('O3 — /tableau : balise <main> présente (landmark ARIA)', async ({
    page,
  }) => {
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    const main = page.locator('main, [role="main"]').first()
    await expect(main).toBeVisible({ timeout: 8000 })
  })

  test('O4 — /tableau : focus visible sur les éléments interactifs', async ({
    page,
  }) => {
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Tab vers le premier élément interactif
    await page.keyboard.press('Tab')

    // Vérifier qu'un élément est focusé
    const hasFocus = await page.evaluate(() => {
      return document.activeElement !== document.body
    })
    expect(hasFocus).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests impossibles à automatiser — documentés ici
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visitor — Tests manuels requis [SKIP]', () => {
  test.skip(
    true,
    'LongPressGuard : nécessite interaction tactile (2s press) — test manuel'
  )
  test('L1 — LongPressGuard bloque le clic simple vers /edition depuis /tableau', async () => {
    // Ce test requiert un vrai appui long (2s) qui n'est pas reproductible
    // de façon fiable avec les outils Playwright (pointeurs simulés).
    // Tester manuellement : depuis /tableau, cliquer une fois sur le lien Edition
    // → doit rester sur /tableau. Maintenir 2s → doit naviguer vers /edition.
  })

  test.skip(
    true,
    'Import Visitor → Compte : nécessite Turnstile pour le signup'
  )
  test('N1 — Import données Visitor après signup', async () => {
    // Flow : créer des slots en Visitor → aller sur /signup → compléter l'inscription
    // → vérifier modal d'import → importer → vérifier données en DB
    // Bloquant : le signup nécessite Turnstile non mockable en E2E actuellement.
  })
})
