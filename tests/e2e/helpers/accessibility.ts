/**
 * ♿ Helpers d'accessibilité pour tests E2E Playwright
 *
 * Fournit des utilitaires pour vérifier la conformité WCAG 2.2 AA.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Page, Locator, expect } from '@playwright/test'
import type { AxeResults } from 'axe-core'
import * as path from 'path'

/**
 * Options pour l'analyse d'accessibilité
 */
export interface A11yCheckOptions {
  /** Règles à inclure */
  rules?: string[]
  /** Règles à exclure */
  skipRules?: string[]
  /** Niveau de conformité WCAG (A, AA, AAA) */
  wcagLevel?: 'A' | 'AA' | 'AAA'
  /** Tags Axe-core à utiliser */
  tags?: string[]
}

/**
 * Injecter Axe-core dans la page
 *
 * @param page - Page Playwright
 *
 * @example
 * await injectAxe(page)
 */
export async function injectAxe(page: Page): Promise<void> {
  // Injecter axe-core depuis le package local au lieu du CDN pour éviter les timeouts réseau
  // Trouver le chemin vers axe-core dans node_modules
  const axePath = path.join(
    process.cwd(),
    'node_modules',
    'axe-core',
    'axe.min.js'
  )
  await page.addScriptTag({ path: axePath })
}

/**
 * Exécuter une analyse d'accessibilité sur la page
 *
 * @param page - Page Playwright
 * @param options - Options de l'analyse
 * @returns Résultats de l'analyse Axe
 *
 * @example
 * const results = await checkA11y(page)
 */
export async function checkA11y(
  page: Page,
  options: A11yCheckOptions = {}
): Promise<AxeResults> {
  const { wcagLevel = 'AA', tags = [], skipRules = [] } = options

  // S'assurer qu'Axe est injecté
  await injectAxe(page)

  // Construire les tags
  const axeTags = [
    `wcag2${wcagLevel.toLowerCase()}`,
    'wcag2aa',
    'best-practice',
    ...tags,
  ]

  // Exécuter l'analyse
  const results = await page.evaluate(
    async ({ tags, skipRules }) => {
      const axe = (window as any).axe
      if (!axe) {
        throw new Error('Axe-core not loaded')
      }

      return await axe.run({
        runOnly: {
          type: 'tag',
          values: tags,
        },
        rules: skipRules.reduce(
          (acc, rule) => {
            acc[rule] = { enabled: false }
            return acc
          },
          {} as Record<string, { enabled: boolean }>
        ),
      })
    },
    { tags: axeTags, skipRules }
  )

  return results
}

/**
 * Vérifier qu'il n'y a pas de violations d'accessibilité
 *
 * @param page - Page Playwright
 * @param options - Options de l'analyse
 *
 * @example
 * await expectNoA11yViolations(page)
 */
export async function expectNoA11yViolations(
  page: Page,
  options: A11yCheckOptions = {}
): Promise<void> {
  const results = await checkA11y(page, options)

  if (results.violations.length > 0) {
    const violationReport = results.violations
      .map(violation => {
        const targets = violation.nodes
          .map(node => node.target.join(' > '))
          .join('\n    ')
        return `
❌ ${violation.id}: ${violation.description}
   Impact: ${violation.impact}
   Help: ${violation.help}
   Nodes (${violation.nodes.length}):
    ${targets}
`
      })
      .join('\n')

    throw new Error(
      `Found ${results.violations.length} accessibility violation(s):\n${violationReport}`
    )
  }

  expect(results.violations).toHaveLength(0)
}

/**
 * Vérifier la navigation au clavier
 *
 * @param page - Page Playwright
 * @param elementsToTab - Nombre d'éléments à traverser avec Tab
 *
 * @example
 * await checkKeyboardNavigation(page, 5)
 */
export async function checkKeyboardNavigation(
  page: Page,
  elementsToTab = 5
): Promise<void> {
  // Commencer au début de la page
  await page.keyboard.press('Tab')

  const focusedElements: string[] = []

  for (let i = 0; i < elementsToTab; i++) {
    // Obtenir l'élément actuellement focusé
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement
      return el ? el.tagName + (el.id ? `#${el.id}` : '') : 'none'
    })

    focusedElements.push(focusedElement)

    // Passer à l'élément suivant
    await page.keyboard.press('Tab')

    // Attendre un peu pour laisser le focus se déplacer
    await page.waitForTimeout(100)
  }

  // Vérifier qu'on a bien navigué entre différents éléments
  const uniqueElements = new Set(focusedElements)
  expect(uniqueElements.size).toBeGreaterThan(1)
}

/**
 * Vérifier le contraste des couleurs d'un élément
 *
 * @param locator - Locator Playwright
 * @param minContrastRatio - Ratio de contraste minimum (4.5 pour AA, 7 pour AAA)
 *
 * @example
 * await checkColorContrast(page.locator('h1'), 4.5)
 */
export async function checkColorContrast(
  locator: Locator,
  minContrastRatio = 4.5
): Promise<void> {
  const contrast = await locator.evaluate((element, minRatio) => {
    const computedStyle = window.getComputedStyle(element)
    const color = computedStyle.color
    const backgroundColor = computedStyle.backgroundColor

    // Fonction pour calculer la luminance relative
    const getLuminance = (rgb: string): number => {
      const components = rgb
        .match(/\d+/g)!
        .map(Number)
        .map(val => {
          const s = val / 255
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        })
      const [r = 0, g = 0, b = 0] = components
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    // Calculer le ratio de contraste
    const l1 = getLuminance(color)
    const l2 = getLuminance(backgroundColor)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

    return {
      ratio,
      passes: ratio >= minRatio,
      color,
      backgroundColor,
    }
  }, minContrastRatio)

  expect(contrast.passes).toBe(true)
}

/**
 * Vérifier qu'un élément a un label accessible
 *
 * @param locator - Locator Playwright
 *
 * @example
 * await expectToHaveAccessibleLabel(page.locator('button'))
 */
export async function expectToHaveAccessibleLabel(
  locator: Locator
): Promise<void> {
  const accessibleName = await locator.evaluate(element => {
    // Récupérer le nom accessible via aria-label, aria-labelledby ou textContent
    const ariaLabel = element.getAttribute('aria-label')
    const ariaLabelledBy = element.getAttribute('aria-labelledby')

    if (ariaLabel) return ariaLabel

    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy)
      return labelElement?.textContent?.trim() || ''
    }

    // Pour les inputs, chercher un label associé
    if (element instanceof HTMLInputElement) {
      const id = element.id
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`)
        if (label) return label.textContent?.trim() || ''
      }
    }

    return element.textContent?.trim() || ''
  })

  expect(accessibleName).toBeTruthy()
  expect(accessibleName.length).toBeGreaterThan(0)
}

/**
 * Vérifier qu'un élément a un rôle ARIA approprié
 *
 * @param locator - Locator Playwright
 * @param expectedRole - Rôle ARIA attendu
 *
 * @example
 * await expectToHaveRole(page.locator('[data-testid="dialog"]'), 'dialog')
 */
export async function expectToHaveRole(
  locator: Locator,
  expectedRole: string
): Promise<void> {
  const role = await locator.getAttribute('role')
  expect(role).toBe(expectedRole)
}

/**
 * Vérifier que les landmarks ARIA sont présents
 *
 * @param page - Page Playwright
 *
 * @example
 * await checkLandmarks(page)
 */
export async function checkLandmarks(page: Page): Promise<void> {
  const landmarks = await page.evaluate(() => {
    const landmarkRoles = [
      'banner',
      'navigation',
      'main',
      'contentinfo',
      'complementary',
    ]
    const found: string[] = []

    landmarkRoles.forEach(role => {
      const elements = document.querySelectorAll(`[role="${role}"], ${role}`)
      if (elements.length > 0) {
        found.push(role)
      }
    })

    return found
  })

  // Au minimum, on devrait avoir un <main>
  expect(landmarks).toContain('main')
}

/**
 * Vérifier qu'une image a un texte alternatif
 *
 * @param locator - Locator Playwright (image)
 *
 * @example
 * await expectImageToHaveAlt(page.locator('img'))
 */
export async function expectImageToHaveAlt(locator: Locator): Promise<void> {
  const alt = await locator.getAttribute('alt')
  expect(alt).toBeDefined()
  // Le alt peut être vide pour les images décoratives, mais il doit être défini
}

/**
 * Vérifier que les headings sont dans l'ordre
 *
 * @param page - Page Playwright
 *
 * @example
 * await checkHeadingOrder(page)
 */
export async function checkHeadingOrder(page: Page): Promise<void> {
  const headingLevels = await page.evaluate(() => {
    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    )
    return headings.map(h => parseInt(h.tagName.substring(1)))
  })

  if (headingLevels.length === 0) return

  // Vérifier qu'on commence par h1
  expect(headingLevels[0]).toBe(1)

  // Vérifier qu'il n'y a pas de sauts de niveau (ex: h1 -> h3)
  for (let i = 1; i < headingLevels.length; i++) {
    const currentLevel = headingLevels[i]!
    const previousLevel = headingLevels[i - 1]!
    const diff = currentLevel - previousLevel
    expect(diff).toBeLessThanOrEqual(1)
  }
}

/**
 * Vérifier la présence d'un skip link
 *
 * @param page - Page Playwright
 *
 * @example
 * await checkSkipLink(page)
 */
export async function checkSkipLink(page: Page): Promise<void> {
  const skipLink = page.locator('a[href="#main"], a[href="#content"]').first()
  await expect(skipLink).toBeAttached()
}
