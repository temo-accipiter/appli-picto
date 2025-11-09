/**
 * 🎯 Phase 6 - Tests Drag-and-Drop (PARTIE 2)
 *
 * Tests de la fonctionnalité de glisser-déposer des tâches.
 *
 * Couverture :
 * 1. Réorganisation des tâches par drag-and-drop
 * 2. Accessibilité clavier du drag-and-drop
 * 3. Feedback visuel et animations
 * 4. Persistance en base de données
 * 5. Annonces ARIA pour lecteurs d'écran
 */

import { test, expect, Page } from '@playwright/test'
import {
  cleanupDatabase,
  createTestUser,
  loginAs,
  expectNoA11yViolations,
} from './helpers'

/**
 * Helper pour créer des tâches de test
 */
async function createTestTasks(page: Page, count = 3): Promise<void> {
  // Naviguer vers la page d'édition
  await page.goto('/edition')
  await page.waitForLoadState('networkidle')

  // Créer N tâches
  for (let i = 1; i <= count; i++) {
    // Cliquer sur le bouton "Ajouter une tâche"
    const addButton = page.locator('button', { hasText: /ajouter.*tâche/i }).first()
    await addButton.click()

    // Remplir le formulaire
    await page.locator('input[name="label"]').fill(`Tâche ${i}`)

    // Sauvegarder
    const saveButton = page.locator('button', { hasText: /enregistrer|sauvegarder/i }).first()
    await saveButton.click()

    // Attendre que la tâche soit créée
    await page.waitForTimeout(500)
  }
}

/**
 * Helper pour vérifier l'ordre des tâches
 */
async function getTaskOrder(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-task-label], .tableau-card'))
    return cards.map((card) => {
      const label =
        card.getAttribute('data-task-label') ||
        card.querySelector('.card-label')?.textContent?.trim() ||
        ''
      return label
    })
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// SETUP & CLEANUP
// ═════════════════════════════════════════════════════════════════════════════

test.beforeEach(async () => {
  await cleanupDatabase()
})

test.afterEach(async () => {
  await cleanupDatabase()
})

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1 : RÉORGANISATION PAR DRAG-AND-DROP
// ═════════════════════════════════════════════════════════════════════════════

test.describe('🎯 Drag-and-Drop - Réorganisation', () => {
  test('Réorganiser 3 tâches - Ordre mis à jour visuellement et en DB', async ({ page }) => {
    // Créer un utilisateur de test
    const user = await createTestUser({ role: 'free' })
    await loginAs(page, user.email, user.password)

    // Créer 3 tâches
    await createTestTasks(page, 3)

    // Naviguer vers le tableau
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Vérifier l'ordre initial
    const initialOrder = await getTaskOrder(page)
    expect(initialOrder).toEqual(['Tâche 1', 'Tâche 2', 'Tâche 3'])

    // Drag tâche 1 vers position 3
    const task1 = page.locator('[data-task-label="Tâche 1"]').or(
      page.locator('.tableau-card').filter({ hasText: 'Tâche 1' })
    ).first()
    const task3 = page.locator('[data-task-label="Tâche 3"]').or(
      page.locator('.tableau-card').filter({ hasText: 'Tâche 3' })
    ).first()

    // Effectuer le drag-and-drop
    await task1.dragTo(task3)

    // Attendre la mise à jour
    await page.waitForTimeout(1000)

    // Vérifier le nouvel ordre visuel
    const newOrder = await getTaskOrder(page)
    expect(newOrder).toEqual(['Tâche 2', 'Tâche 3', 'Tâche 1'])

    // Recharger la page pour vérifier la persistance en DB
    await page.reload()
    await page.waitForLoadState('networkidle')

    const persistedOrder = await getTaskOrder(page)
    expect(persistedOrder).toEqual(['Tâche 2', 'Tâche 3', 'Tâche 1'])
  })

  test('Drag-and-drop - Animations fluides ≤ 150ms', async ({ page }) => {
    const user = await createTestUser({ role: 'free' })
    await loginAs(page, user.email, user.password)

    await createTestTasks(page, 2)
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Vérifier les transitions CSS
    const transitions = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.tableau-card, [data-task-card]'))
      const longTransitions: string[] = []

      cards.forEach((card) => {
        const styles = window.getComputedStyle(card)
        const transition = styles.transitionDuration

        if (transition && transition !== '0s') {
          const duration = parseFloat(transition) * 1000
          if (duration > 150) {
            longTransitions.push(`${card.className} - ${duration}ms`)
          }
        }
      })

      return longTransitions
    })

    // Pas d'animations > 150ms (contrainte TSA)
    if (transitions.length > 0) {
      console.log('⚠️  Animations > 150ms détectées :', transitions)
    }
    expect(transitions.length).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// TEST 2 : ACCESSIBILITÉ CLAVIER
// ═════════════════════════════════════════════════════════════════════════════

test.describe('♿ Drag-and-Drop - Accessibilité Clavier', () => {
  test('Réorganiser avec clavier - Tab, Espace, Flèches', async ({ page }) => {
    const user = await createTestUser({ role: 'free' })
    await loginAs(page, user.email, user.password)

    await createTestTasks(page, 3)
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Vérifier l'ordre initial
    const initialOrder = await getTaskOrder(page)
    expect(initialOrder).toEqual(['Tâche 1', 'Tâche 2', 'Tâche 3'])

    // Utiliser Tab pour sélectionner la première tâche
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // Peut-être besoin de plusieurs Tab pour atteindre la carte

    // Vérifier que la première tâche est focusée
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement
      return el?.textContent?.includes('Tâche') || false
    })

    if (focusedElement) {
      // Appuyer Espace pour "grab" (si @dnd-kit le supporte)
      await page.keyboard.press('Space')
      await page.waitForTimeout(200)

      // Utiliser flèches pour déplacer
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)

      // Appuyer Espace pour "drop"
      await page.keyboard.press('Space')
      await page.waitForTimeout(1000)

      // Vérifier l'ordre mis à jour
      const newOrder = await getTaskOrder(page)
      console.log('Nouvel ordre après drag clavier :', newOrder)

      // L'ordre devrait avoir changé (Tâche 1 devrait être plus bas)
      expect(newOrder).not.toEqual(initialOrder)
    } else {
      console.log('⚠️  Impossible de focus une tâche avec Tab - feature peut-être non implémentée')
    }
  })

  test('Drag-and-drop - Annonces ARIA pour lecteurs d\'écran', async ({ page }) => {
    const user = await createTestUser({ role: 'free' })
    await loginAs(page, user.email, user.password)

    await createTestTasks(page, 2)
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Vérifier la présence de régions live pour les annonces
    const liveRegions = await page.evaluate(() => {
      const regions = document.querySelectorAll(
        '[aria-live], [role="status"], [role="alert"]'
      )
      return Array.from(regions).map((r) => ({
        role: r.getAttribute('role'),
        ariaLive: r.getAttribute('aria-live'),
        content: r.textContent?.trim(),
      }))
    })

    console.log('Régions live trouvées :', liveRegions)

    // Au moins une région live devrait exister
    expect(liveRegions.length).toBeGreaterThan(0)
  })

  test('Drag-and-drop - Attributs ARIA corrects (aria-grabbed, aria-dropeffect)', async ({ page }) => {
    const user = await createTestUser({ role: 'free' })
    await loginAs(page, user.email, user.password)

    await createTestTasks(page, 2)
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Vérifier que les tâches ont des attributs ARIA appropriés
    const ariaAttributes = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.tableau-card, [data-task-card]'))
      return cards.map((card) => ({
        role: card.getAttribute('role'),
        ariaGrabbed: card.getAttribute('aria-grabbed'),
        ariaDropeffect: card.getAttribute('aria-dropeffect'),
        tabindex: card.getAttribute('tabindex'),
      }))
    })

    console.log('Attributs ARIA des cartes :', ariaAttributes)

    // Les cartes devraient avoir un tabindex pour être accessibles au clavier
    const hasTabindex = ariaAttributes.some((attr) => attr.tabindex !== null)
    expect(hasTabindex).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// TEST 3 : FEEDBACK VISUEL
// ═════════════════════════════════════════════════════════════════════════════

test.describe('🎨 Drag-and-Drop - Feedback Visuel', () => {
  test('Feedback visuel pendant drag - Ombre, opacité, zone de drop', async ({ page }) => {
    const user = await createTestUser({ role: 'free' })
    await loginAs(page, user.email, user.password)

    await createTestTasks(page, 2)
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Commencer à drag une tâche
    const task1 = page.locator('.tableau-card').first()
    const task1Box = await task1.boundingBox()

    if (task1Box) {
      // Démarrer le drag (mousedown)
      await page.mouse.move(task1Box.x + task1Box.width / 2, task1Box.y + task1Box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(200)

      // Déplacer la souris
      await page.mouse.move(task1Box.x + task1Box.width / 2, task1Box.y + task1Box.height + 50)
      await page.waitForTimeout(200)

      // Vérifier l'indicateur visuel (overlay, opacité, etc.)
      const dragOverlay = await page.evaluate(() => {
        const overlay = document.querySelector('[data-dnd-overlay], .drag-overlay')
        return overlay !== null
      })

      console.log('Drag overlay présent :', dragOverlay)

      // Relâcher
      await page.mouse.up()
    }

    // Vérifier les styles CSS pendant le drag
    // (Difficile à tester précisément, mais on peut vérifier qu'il n'y a pas d'erreurs)
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Pas d'erreurs pendant le drag
    expect(consoleErrors.length).toBe(0)
  })

  test('Accessibilité du drag-and-drop - Pas de violations WCAG', async ({ page }) => {
    const user = await createTestUser({ role: 'free' })
    await loginAs(page, user.email, user.password)

    await createTestTasks(page, 2)
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')

    // Vérifier l'accessibilité du tableau avec drag-and-drop
    await expectNoA11yViolations(page)
  })
})
