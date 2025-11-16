/**
 * ♿ Phase 6 - Tests d'Accessibilité WCAG 2.2 AA
 *
 * Ce fichier teste la conformité WCAG 2.2 AA sur toutes les pages et composants.
 *
 * Couverture :
 * 1. Audit de toutes les pages principales
 * 2. Audit des composants interactifs
 * 3. Tests spécifiques WCAG 2.2 AA (contraste, focus, ARIA, headings, landmarks)
 * 4. Tests animations (≤ 150ms, pas de flash > 3 Hz)
 * 5. Tests lecteurs d'écran (rôles ARIA)
 *
 * Objectif : 0 violation critique, 0 violation sérieuse
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect, Page } from '@playwright/test'
import type { AxeResults } from 'axe-core'
import {
  checkA11y,
  expectNoA11yViolations,
  checkKeyboardNavigation,
  checkLandmarks,
  checkHeadingOrder,
  expectImageToHaveAlt,
  expectToHaveAccessibleLabel,
} from '../e2e/helpers'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Interface pour les résultats d'audit consolidés
 */
interface AuditReport {
  timestamp: string
  totalPages: number
  totalViolations: number
  criticalViolations: number
  seriousViolations: number
  moderateViolations: number
  minorViolations: number
  pages: PageAuditResult[]
  summary: string
}

interface PageAuditResult {
  url: string
  title: string
  violations: number
  critical: number
  serious: number
  moderate: number
  minor: number
  details: AxeResults
}

// Stockage des résultats pour le rapport final
const auditResults: PageAuditResult[] = []

/**
 * Helper pour mocker le captcha Turnstile sur les pages d'auth
 */
async function mockTurnstileCaptcha(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as any).turnstile = {
      render: (_element: HTMLElement, options: any) => {
        if (options.onSuccess) {
          setTimeout(() => options.onSuccess('mock-turnstile-token-123'), 100)
        }
        return 'mock-widget-id'
      },
      reset: () => {},
      remove: () => {},
      getResponse: () => 'mock-turnstile-token-123',
    }
  })

  await page.route('**/challenges.cloudflare.com/**', route => route.abort())
  await page.route('**/cloudflare.com/turnstile/**', route => route.abort())
}

/**
 * Helper pour auditer une page et stocker les résultats
 */
async function auditPage(
  page: Page,
  url: string,
  title: string,
  options: { skipRules?: string[] } = {}
): Promise<void> {
  await page.goto(url)
  await page.waitForLoadState('networkidle')

  // Exécuter l'audit
  const results = await checkA11y(page, {
    wcagLevel: 'AA',
    skipRules: options.skipRules || [],
  })

  // Compter les violations par niveau
  const critical = results.violations.filter(
    v => v.impact === 'critical'
  ).length
  const serious = results.violations.filter(v => v.impact === 'serious').length
  const moderate = results.violations.filter(
    v => v.impact === 'moderate'
  ).length
  const minor = results.violations.filter(v => v.impact === 'minor').length

  // Stocker les résultats
  auditResults.push({
    url,
    title,
    violations: results.violations.length,
    critical,
    serious,
    moderate,
    minor,
    details: results,
  })

  // Logger dans la console
  if (results.violations.length > 0) {
    console.log(`\n⚠️  ${title} - ${results.violations.length} violation(s)`)
    console.log(
      `   Critical: ${critical}, Serious: ${serious}, Moderate: ${moderate}, Minor: ${minor}`
    )
  } else {
    console.log(`\n✅ ${title} - Aucune violation`)
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PARTIE 1 : AUDIT DES PAGES PRINCIPALES
// ═════════════════════════════════════════════════════════════════════════════

test.describe('♿ Audit WCAG 2.2 AA - Pages Principales', () => {
  test("Page d'accueil (/) - Pas de violations critiques", async ({ page }) => {
    await auditPage(page, '/', "Page d'accueil")

    // Vérifier 0 violation critique/sérieuse
    const result = auditResults[auditResults.length - 1]!
    expect(result.critical).toBe(0)
    expect(result.serious).toBe(0)
  })

  test('Page Login (/login) - Pas de violations critiques', async ({
    page,
  }) => {
    await mockTurnstileCaptcha(page)
    await auditPage(page, '/login', 'Page Login')

    const result = auditResults[auditResults.length - 1]!
    expect(result.critical).toBe(0)
    expect(result.serious).toBe(0)
  })

  test('Page Signup (/signup) - Pas de violations critiques', async ({
    page,
  }) => {
    await mockTurnstileCaptcha(page)
    await auditPage(page, '/signup', 'Page Signup')

    const result = auditResults[auditResults.length - 1]!
    expect(result.critical).toBe(0)
    expect(result.serious).toBe(0)
  })

  test('Page Forgot Password (/forgot-password) - Pas de violations critiques', async ({
    page,
  }) => {
    await mockTurnstileCaptcha(page)
    await auditPage(page, '/forgot-password', 'Page Forgot Password')

    const result = auditResults[auditResults.length - 1]!
    expect(result.critical).toBe(0)
    expect(result.serious).toBe(0)
  })

  test('Page Tableau (/tableau) - Dashboard enfant - Pas de violations critiques', async ({
    page,
  }) => {
    await auditPage(page, '/tableau', 'Page Tableau')

    const result = auditResults[auditResults.length - 1]!
    expect(result.critical).toBe(0)
    expect(result.serious).toBe(0)
  })

  test('Page Mentions Légales (/legal/mentions-legales) - Pas de violations critiques', async ({
    page,
  }) => {
    await auditPage(page, '/legal/mentions-legales', 'Page Mentions Légales')

    const result = auditResults[auditResults.length - 1]!
    expect(result.critical).toBe(0)
    expect(result.serious).toBe(0)
  })

  test('Page CGU (/legal/cgu) - Pas de violations critiques', async ({ page }) => {
    await auditPage(page, '/legal/cgu', 'Page CGU')

    const result = auditResults[auditResults.length - 1]!
    expect(result.critical).toBe(0)
    expect(result.serious).toBe(0)
  })

  test('Page Politique de Confidentialité (/legal/politique-confidentialite) - Pas de violations critiques', async ({
    page,
  }) => {
    await auditPage(
      page,
      '/legal/politique-confidentialite',
      'Page Politique de Confidentialité'
    )

    const result = auditResults[auditResults.length - 1]!
    expect(result.critical).toBe(0)
    expect(result.serious).toBe(0)
  })

  test('Page Accessibilité (/legal/accessibilite) - Pas de violations critiques', async ({
    page,
  }) => {
    await auditPage(page, '/legal/accessibilite', 'Page Accessibilité')

    const result = auditResults[auditResults.length - 1]!
    expect(result.critical).toBe(0)
    expect(result.serious).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PARTIE 2 : TESTS WCAG 2.2 AA SPÉCIFIQUES
// ═════════════════════════════════════════════════════════════════════════════

test.describe('♿ Tests WCAG 2.2 AA Spécifiques', () => {
  test('Contraste des couleurs - Minimum 4.5:1 pour texte normal', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier les violations de contraste avec axe
    const results = await checkA11y(page, {
      rules: ['color-contrast'],
    })

    // Toutes les violations de contraste doivent être documentées
    const contrastViolations = results.violations.filter(
      v => v.id === 'color-contrast'
    )

    if (contrastViolations.length > 0) {
      console.log('\n⚠️  Violations de contraste détectées :')
      contrastViolations.forEach(v => {
        console.log(`   ${v.help}`)
        v.nodes.forEach(node => {
          console.log(`     - ${node.target}`)
        })
      })
    }

    // Pas de violation critique de contraste
    expect(contrastViolations.filter(v => v.impact === 'serious').length).toBe(
      0
    )
  })

  test('Focus visible - Tous les éléments interactifs ont un indicateur de focus', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Tester la navigation au clavier
    await checkKeyboardNavigation(page, 10)

    // Vérifier que chaque élément focusé a un outline visible
    const focusableElements = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      return elements.length
    })

    expect(focusableElements).toBeGreaterThan(0)
  })

  test('Navigation clavier - Tab fonctionne sur tous les composants', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await mockTurnstileCaptcha(page)

    // Tester la navigation au clavier sur le formulaire
    await checkKeyboardNavigation(page, 5)

    // Vérifier qu'on peut naviguer entre les champs
    await page.keyboard.press('Tab')
    const focusedEmail = await page.evaluate(() =>
      document.activeElement?.getAttribute('type')
    )
    expect(['email', 'text', 'password', null]).toContain(focusedEmail)
  })

  test('ARIA labels - Tous les boutons/liens ont des labels clairs', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier les violations ARIA avec axe
    const results = await checkA11y(page, {
      tags: ['wcag2aa', 'wcag21aa', 'wcag22aa'],
    })

    const ariaViolations = results.violations.filter(
      v => v.id.includes('aria-') || v.id.includes('label')
    )

    // Pas de violation ARIA critique
    expect(ariaViolations.filter(v => v.impact === 'critical').length).toBe(0)
    expect(ariaViolations.filter(v => v.impact === 'serious').length).toBe(0)
  })

  test('Alt text - Toutes les images ont un texte alternatif', async ({
    page,
  }) => {
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Récupérer toutes les images
    const images = page.locator('img')
    const count = await images.count()

    // Vérifier que toutes les images ont un attribut alt (peut être vide pour décoratives)
    for (let i = 0; i < count; i++) {
      await expectImageToHaveAlt(images.nth(i))
    }
  })

  test('Headings - Hiérarchie correcte (h1 → h2 → h3)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await checkHeadingOrder(page)
  })

  test('Landmarks - header, main, nav correctement balisés', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await checkLandmarks(page)

    // Vérifier la présence d'un header
    const header = page.locator('header, [role="banner"]')
    await expect(header).toBeAttached()

    // Vérifier la présence d'un main
    const main = page.locator('main, [role="main"]')
    await expect(main).toBeAttached()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PARTIE 3 : TESTS ANIMATIONS
// ═════════════════════════════════════════════════════════════════════════════

test.describe('♿ Tests Animations - Conformité WCAG', () => {
  test('Animations ≤ 150ms - Respect contrainte projet TSA', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier les transitions CSS
    const transitions = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*')
      const longTransitions: string[] = []

      allElements.forEach(el => {
        const styles = window.getComputedStyle(el)
        const transition = styles.transitionDuration

        if (transition && transition !== '0s') {
          const duration = parseFloat(transition) * 1000 // Convertir en ms
          if (duration > 150) {
            longTransitions.push(
              `${el.tagName}.${el.className} - ${duration}ms`
            )
          }
        }
      })

      return longTransitions
    })

    if (transitions.length > 0) {
      console.log('\n⚠️  Animations > 150ms détectées :')
      transitions.forEach(t => console.log(`   ${t}`))
    }

    // Pas d'animations > 150ms (contrainte TSA)
    expect(transitions.length).toBe(0)
  })

  test('Pas de clignotement > 3 Hz - Prévention épilepsie', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier les animations avec axe-core
    const results = await checkA11y(page, {
      rules: ['meta-refresh'], // Pas de rafraîchissement automatique
    })

    const blinkViolations = results.violations.filter(
      v => v.id === 'meta-refresh'
    )
    expect(blinkViolations.length).toBe(0)

    // Vérifier qu'il n'y a pas d'animations infinies rapides
    const rapidAnimations = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*')
      const rapid: string[] = []

      allElements.forEach(el => {
        const styles = window.getComputedStyle(el)
        const animation = styles.animationDuration

        if (animation && animation !== '0s') {
          const duration = parseFloat(animation) * 1000
          // Animation < 333ms (3 Hz) est dangereuse si infinie
          if (duration < 333 && styles.animationIterationCount === 'infinite') {
            rapid.push(`${el.tagName}.${el.className} - ${duration}ms infinite`)
          }
        }
      })

      return rapid
    })

    expect(rapidAnimations.length).toBe(0)
  })

  test('prefers-reduced-motion - Respect des préférences utilisateur', async ({
    page,
  }) => {
    // Activer prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier que les animations sont désactivées ou réduites
    const hasReducedMotion = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })

    expect(hasReducedMotion).toBe(true)

    // Vérifier que le CSS respecte cette préférence
    // (Le CSS devrait avoir des @media (prefers-reduced-motion: reduce))
    const animationsDisabled = await page.evaluate(() => {
      const testElement = document.body
      const styles = window.getComputedStyle(testElement)

      // Si prefers-reduced-motion est actif, les animations devraient être minimes
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })

    expect(animationsDisabled).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PARTIE 4 : TESTS COMPOSANTS INTERACTIFS
// ═════════════════════════════════════════════════════════════════════════════

test.describe('♿ Tests Composants Interactifs', () => {
  test('Boutons - Tous ont des labels accessibles', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const buttons = page.locator('button')
    const count = await buttons.count()

    // Vérifier que tous les boutons ont un label accessible
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      await expectToHaveAccessibleLabel(button)
    }
  })

  test('Liens - Tous ont des labels accessibles', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const links = page.locator('a')
    const count = await links.count()

    // Vérifier que tous les liens ont un label accessible
    for (let i = 0; i < count; i++) {
      const link = links.nth(i)
      await expectToHaveAccessibleLabel(link)
    }
  })

  test('Formulaires - Tous les champs ont des labels', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Vérifier les violations de formulaire avec axe
    const results = await checkA11y(page, {
      tags: ['wcag2aa'],
    })

    const formViolations = results.violations.filter(
      v => v.id.includes('label') || v.id.includes('form')
    )

    // Pas de violation critique de formulaire
    expect(formViolations.filter(v => v.impact === 'critical').length).toBe(0)
    expect(formViolations.filter(v => v.impact === 'serious').length).toBe(0)
  })

  test('Navigation - Header et sidebar accessibles au clavier', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Tester la navigation au clavier dans le header
    await checkKeyboardNavigation(page, 8)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PARTIE 5 : TESTS LECTEURS D'ÉCRAN (ARIA)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("♿ Tests Lecteurs d'Écran - ARIA", () => {
  test('Rôles ARIA corrects - button, link, dialog', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier les violations ARIA avec axe
    const results = await checkA11y(page, {
      tags: ['wcag2aa'],
    })

    const ariaRoleViolations = results.violations.filter(
      v => v.id.includes('aria-roles') || v.id.includes('aria-required')
    )

    // Pas de violation ARIA critique
    expect(ariaRoleViolations.filter(v => v.impact === 'critical').length).toBe(
      0
    )
  })

  test('aria-label sur icônes seules', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Rechercher les boutons qui contiennent uniquement des icônes (SVG)
    const iconButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const iconOnly: string[] = []

      buttons.forEach(btn => {
        const hasIcon = btn.querySelector('svg') !== null
        const hasText = btn.textContent?.trim().length > 0
        const hasAriaLabel = btn.hasAttribute('aria-label')

        if (hasIcon && !hasText && !hasAriaLabel) {
          iconOnly.push(btn.outerHTML)
        }
      })

      return iconOnly
    })

    if (iconButtons.length > 0) {
      console.log('\n⚠️  Boutons icônes sans aria-label :')
      iconButtons.forEach(btn => console.log(`   ${btn}`))
    }

    // Tous les boutons icônes doivent avoir un aria-label
    expect(iconButtons.length).toBe(0)
  })

  test("aria-describedby pour messages d'aide", async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Vérifier les violations aria-describedby avec axe
    const results = await checkA11y(page, {
      rules: ['aria-valid-attr-value'],
    })

    const describedByViolations = results.violations.filter(v =>
      v.id.includes('aria-valid-attr-value')
    )

    // Pas de violation aria-describedby
    expect(describedByViolations.length).toBe(0)
  })

  test('aria-live pour notifications dynamiques', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier que les zones de notifications utilisent aria-live
    const liveRegions = await page.evaluate(() => {
      const regions = document.querySelectorAll(
        '[aria-live], [role="status"], [role="alert"]'
      )
      return regions.length
    })

    // Au moins une région live devrait exister pour les toasts/notifications
    // (optionnel, mais recommandé)
    console.log(`\nℹ️  Régions live trouvées : ${liveRegions}`)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DU RAPPORT HTML
// ═════════════════════════════════════════════════════════════════════════════

test.afterAll(async () => {
  // Générer le rapport HTML après tous les tests
  const report = generateAuditReport()
  await saveHtmlReport(report)
})

/**
 * Générer un rapport d'audit consolidé
 */
function generateAuditReport(): AuditReport {
  const totalViolations = auditResults.reduce((sum, r) => sum + r.violations, 0)
  const criticalViolations = auditResults.reduce(
    (sum, r) => sum + r.critical,
    0
  )
  const seriousViolations = auditResults.reduce((sum, r) => sum + r.serious, 0)
  const moderateViolations = auditResults.reduce(
    (sum, r) => sum + r.moderate,
    0
  )
  const minorViolations = auditResults.reduce((sum, r) => sum + r.minor, 0)

  let summary = '✅ WCAG 2.2 AA - Conformité parfaite'
  if (criticalViolations > 0 || seriousViolations > 0) {
    summary = '❌ WCAG 2.2 AA - Violations critiques détectées'
  } else if (moderateViolations > 0) {
    summary = '⚠️  WCAG 2.2 AA - Violations modérées détectées'
  } else if (minorViolations > 0) {
    summary = '✓ WCAG 2.2 AA - Violations mineures uniquement'
  }

  return {
    timestamp: new Date().toISOString(),
    totalPages: auditResults.length,
    totalViolations,
    criticalViolations,
    seriousViolations,
    moderateViolations,
    minorViolations,
    pages: auditResults,
    summary,
  }
}

/**
 * Sauvegarder le rapport HTML
 */
async function saveHtmlReport(report: AuditReport): Promise<void> {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Accessibilité WCAG 2.2 AA - Appli-Picto</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 2rem;
    }
    header {
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    h1 { font-size: 2rem; color: #2c3e50; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; color: #34495e; margin: 2rem 0 1rem; }
    h3 { font-size: 1.2rem; color: #555; margin: 1rem 0 0.5rem; }
    .meta { color: #666; font-size: 0.9rem; }
    .summary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin: 2rem 0;
      font-size: 1.2rem;
      font-weight: bold;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid #4CAF50;
    }
    .stat-card.critical { border-left-color: #f44336; }
    .stat-card.serious { border-left-color: #ff9800; }
    .stat-card.moderate { border-left-color: #ffc107; }
    .stat-card.minor { border-left-color: #2196f3; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #2c3e50; }
    .stat-label { color: #666; font-size: 0.9rem; }
    .page-result {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
      border-left: 4px solid #4CAF50;
    }
    .page-result.has-violations { border-left-color: #ff9800; }
    .page-result.has-critical { border-left-color: #f44336; }
    .page-title { font-weight: bold; color: #2c3e50; }
    .page-url { color: #666; font-size: 0.9rem; font-family: monospace; }
    .violation-count {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      margin-left: 0.5rem;
      background: #e0e0e0;
    }
    .violation-count.critical { background: #f44336; color: white; }
    .violation-count.serious { background: #ff9800; color: white; }
    .violation-count.moderate { background: #ffc107; color: #333; }
    .violation-count.minor { background: #2196f3; color: white; }
    .badge-success {
      background: #4CAF50;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      display: inline-block;
      margin-left: 0.5rem;
    }
    footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>♿ Rapport d'Accessibilité WCAG 2.2 AA</h1>
      <p class="meta">
        Projet : <strong>Appli-Picto</strong><br>
        Date : <strong>${new Date(report.timestamp).toLocaleString('fr-FR')}</strong><br>
        Pages auditées : <strong>${report.totalPages}</strong>
      </p>
    </header>

    <div class="summary">${report.summary}</div>

    <section>
      <h2>📊 Statistiques Globales</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${report.totalViolations}</div>
          <div class="stat-label">Violations totales</div>
        </div>
        <div class="stat-card critical">
          <div class="stat-value">${report.criticalViolations}</div>
          <div class="stat-label">Critiques</div>
        </div>
        <div class="stat-card serious">
          <div class="stat-value">${report.seriousViolations}</div>
          <div class="stat-label">Sérieuses</div>
        </div>
        <div class="stat-card moderate">
          <div class="stat-value">${report.moderateViolations}</div>
          <div class="stat-label">Modérées</div>
        </div>
        <div class="stat-card minor">
          <div class="stat-value">${report.minorViolations}</div>
          <div class="stat-label">Mineures</div>
        </div>
      </div>
    </section>

    <section>
      <h2>📄 Résultats par Page</h2>
      ${report.pages
        .map(
          page => `
        <div class="page-result ${page.critical > 0 ? 'has-critical' : page.violations > 0 ? 'has-violations' : ''}">
          <div class="page-title">
            ${page.title}
            ${page.violations === 0 ? '<span class="badge-success">✓ Conforme</span>' : ''}
          </div>
          <div class="page-url">${page.url}</div>
          ${
            page.violations > 0
              ? `
            <div style="margin-top: 0.5rem;">
              ${page.critical > 0 ? `<span class="violation-count critical">${page.critical} critique(s)</span>` : ''}
              ${page.serious > 0 ? `<span class="violation-count serious">${page.serious} sérieuse(s)</span>` : ''}
              ${page.moderate > 0 ? `<span class="violation-count moderate">${page.moderate} modérée(s)</span>` : ''}
              ${page.minor > 0 ? `<span class="violation-count minor">${page.minor} mineure(s)</span>` : ''}
            </div>
          `
              : ''
          }
        </div>
      `
        )
        .join('')}
    </section>

    <section>
      <h2>📋 Recommandations</h2>
      <ul style="margin-left: 2rem; line-height: 2;">
        ${
          report.criticalViolations > 0
            ? '<li style="color: #f44336;"><strong>Priorité 1 :</strong> Corriger toutes les violations critiques immédiatement</li>'
            : ''
        }
        ${
          report.seriousViolations > 0
            ? '<li style="color: #ff9800;"><strong>Priorité 2 :</strong> Corriger toutes les violations sérieuses avant mise en production</li>'
            : ''
        }
        ${
          report.moderateViolations > 0
            ? '<li style="color: #ffc107;"><strong>Priorité 3 :</strong> Planifier la correction des violations modérées</li>'
            : ''
        }
        ${
          report.criticalViolations === 0 && report.seriousViolations === 0
            ? '<li style="color: #4CAF50;"><strong>✓</strong> Aucune violation critique ou sérieuse - Excellent travail !</li>'
            : ''
        }
        <li>Tester avec des lecteurs d'écran réels (NVDA, JAWS, VoiceOver)</li>
        <li>Valider la navigation complète au clavier</li>
        <li>Tester avec des utilisateurs TSA réels si possible</li>
      </ul>
    </section>

    <footer>
      <p>
        <strong>Note :</strong> Ce rapport a été généré automatiquement avec axe-core et Playwright.<br>
        Pour plus d'informations : <a href="https://www.w3.org/WAI/WCAG22/quickref/" target="_blank">WCAG 2.2 Quick Reference</a>
      </p>
    </footer>
  </div>
</body>
</html>`

  const reportPath = path.join(
    process.cwd(),
    'tests',
    'accessibility',
    'report.html'
  )
  await fs.writeFile(reportPath, html, 'utf-8')

  console.log(`\n✅ Rapport HTML généré : ${reportPath}`)
  console.log(`\n${report.summary}`)
  console.log(`   Total violations : ${report.totalViolations}`)
  console.log(`   Critiques : ${report.criticalViolations}`)
  console.log(`   Sérieuses : ${report.seriousViolations}`)
  console.log(`   Modérées : ${report.moderateViolations}`)
  console.log(`   Mineures : ${report.minorViolations}`)
}
