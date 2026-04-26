/**
 * 📸 VRT — Baseline visuelle Phase 0 Étape 3
 *
 * Capture l'état de chaque écran AVANT le redesign.
 * Ces screenshots servent de référence : toute régression future sera détectée
 * via `pnpm test:visual` (sans --update-snapshots).
 *
 * Projets : chromium (Desktop Chrome) + Mobile Chrome (Pixel 5)
 * Config  : playwright.visual.config.ts
 *
 * Protocole par test :
 *  1. emulateMedia({ reducedMotion: 'reduce' }) → désactive les animations CSS/JS
 *  2. goto(route) → navigation
 *  3. waitForLoadState('load') → attend DOM + ressources (pas networkidle — Turnstile boucle)
 *  4. addStyleTag(MASK_DYNAMIC) → masque les valeurs instables (timestamps, avatars)
 *  5. toHaveScreenshot({ maxDiffPixelRatio: 0.01 }) → capture + compare
 */

import { test, expect } from '@playwright/test'
import { loginAs, mockTurnstile } from '../e2e/helpers/auth'

// Éléments à masquer : valeurs qui changent entre les runs
// (timestamps, avatars, contenu dynamique des logs)
const MASK_DYNAMIC = `
  .cookie-banner,
  .log-timestamp,
  .log-user,
  .log-event,
  .log-details,
  .log-row,
  .logs-list,
  .history-timestamp,
  [data-testid="timestamp"],
  time,
  [data-testid="user-avatar"],
  .user-avatar,
  .avatar-img,
  [data-dynamic="true"] {
    visibility: hidden !important;
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRANS PUBLICS (pas d'auth requise)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('VRT — Publics', () => {
  test('login', async ({ page }) => {
    await mockTurnstile(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/login')
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: MASK_DYNAMIC })
    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
  })

  test('signup', async ({ page }) => {
    await mockTurnstile(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/signup')
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: MASK_DYNAMIC })
    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
  })

  test('reset-password', async ({ page }) => {
    await mockTurnstile(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/reset-password')
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: MASK_DYNAMIC })
    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
  })

  test('forgot-password', async ({ page }) => {
    await mockTurnstile(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/forgot-password')
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: MASK_DYNAMIC })
    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
  })

  test('tableau', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/tableau')
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: MASK_DYNAMIC })
    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
  })

  test('legal/cgu', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/legal/cgu')
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: MASK_DYNAMIC })
    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRANS AUTHENTIFIÉS — Subscriber
// ─────────────────────────────────────────────────────────────────────────────

test.describe('VRT — Authentifiés (subscriber)', () => {
  // Login via API Supabase (sans Turnstile) avant chaque test
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'subscriber')
  })

  test('profil', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/profil')
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: MASK_DYNAMIC })
    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
  })

  test('abonnement', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/abonnement')
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: MASK_DYNAMIC })
    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRANS ADMIN
// ─────────────────────────────────────────────────────────────────────────────

test.describe('VRT — Admin', () => {
  // Login admin avant chaque test
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('admin/logs', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/admin/logs')
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: MASK_DYNAMIC })
    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
  })
})
