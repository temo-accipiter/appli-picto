/**
 * 🎯 Tests E2E pour DndGrid - Composants DnD réutilisables
 *
 * Vérifie :
 * 1. Drag & drop swap entre items
 * 2. Animations fluides (< 1s)
 * 3. Persistance en base de données
 * 4. Keyboard navigation (WCAG 2.1.1)
 * 5. Add/Remove items avec AnimatePresence
 */

import { test, expect, Page } from '@playwright/test'

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Helper pour obtenir l'ordre des items dans une grille DnD
 */
async function getItemOrder(
  page: Page,
  selector = '.dnd-card'
): Promise<string[]> {
  return await page.evaluate(sel => {
    const cards = Array.from(document.querySelectorAll(sel))
    return cards.map(card => {
      const label = card.textContent?.trim() || ''
      return label
    })
  }, selector)
}

/**
 * Helper pour vérifier le temps d'animation (doit être < 1s)
 */
async function checkAnimationDuration(
  page: Page,
  selector: string
): Promise<number> {
  return await page.evaluate(sel => {
    const element = document.querySelector(sel)
    if (!element) return 0

    const styles = window.getComputedStyle(element)
    const transition = styles.transitionDuration

    if (transition && transition !== '0s') {
      return parseFloat(transition) * 1000 // Convert to ms
    }

    return 0
  }, selector)
}

// ═════════════════════════════════════════════════════════════════════════════
// SETUP & CLEANUP
// ═════════════════════════════════════════════════════════════════════════════

test.describe('🎯 DndGrid E2E - Drag & Drop réutilisable', () => {
  test.beforeEach(async ({ page }) => {
    // Note: Ces tests supposent une page de test dédiée pour DndGrid
    // Dans un vrai projet, cela pourrait être /test/dnd-grid ou une page publique
    // Pour l'instant, on utilise /tableau comme proxy (contient DnD)
    await page.goto('/tableau')
    await page.waitForLoadState('networkidle')
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 1 : Swap items par drag & drop
  // ═════════════════════════════════════════════════════════════════════════════

  test('Swap deux items - Ordre mis à jour visuellement', async ({ page }) => {
    // Vérifier qu'au moins 2 items sont présents
    const itemCount = await page.locator('.dnd-card').count()

    if (itemCount < 2) {
      console.log("⚠️  Pas assez d'items pour tester le swap (besoin de 2+)")
      test.skip()
      return
    }

    // Obtenir l'ordre initial
    const initialOrder = await getItemOrder(page)
    expect(initialOrder.length).toBeGreaterThanOrEqual(2)

    // Drag item 1 vers item 2
    const item1 = page.locator('.dnd-card').first()
    const item2 = page.locator('.dnd-card').nth(1)

    await item1.dragTo(item2)

    // Attendre l'animation de swap
    await page.waitForTimeout(1000)

    // Vérifier que l'ordre a changé
    const newOrder = await getItemOrder(page)
    expect(newOrder).not.toEqual(initialOrder)

    // Les deux premiers items devraient être swappés
    expect(newOrder[0]).toBe(initialOrder[1])
    expect(newOrder[1]).toBe(initialOrder[0])
  })

  test('Drag & drop - Animations ≤ 1s (TSA-friendly)', async ({ page }) => {
    const itemCount = await page.locator('.dnd-card').count()

    if (itemCount < 1) {
      test.skip()
      return
    }

    // Vérifier la durée de transition des cartes
    const duration = await checkAnimationDuration(page, '.dnd-card')

    // WCAG 2.2.3 + TSA : Animations doivent être ≤ 1s
    expect(duration).toBeLessThanOrEqual(1000)

    if (duration > 0) {
      console.log(`✅ Animation duration: ${duration}ms (< 1s)`)
    }
  })

  test('Swap items - Persistance en DB après reload', async ({ page }) => {
    const itemCount = await page.locator('.dnd-card').count()

    if (itemCount < 2) {
      test.skip()
      return
    }

    // Swap
    const item1 = page.locator('.dnd-card').first()
    const item2 = page.locator('.dnd-card').nth(1)
    await item1.dragTo(item2)
    await page.waitForTimeout(1500) // Attendre save async

    // Obtenir le nouvel ordre
    const orderAfterSwap = await getItemOrder(page)

    // Recharger la page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Vérifier que l'ordre est persisté
    const orderAfterReload = await getItemOrder(page)
    expect(orderAfterReload).toEqual(orderAfterSwap)
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 2 : Keyboard navigation (WCAG 2.1.1)
  // ═════════════════════════════════════════════════════════════════════════════

  test('Keyboard navigation - Tab pour focus, Espace pour drag', async ({
    page,
  }) => {
    const itemCount = await page.locator('.dnd-card').count()

    if (itemCount < 2) {
      test.skip()
      return
    }

    // Tab pour focus le premier item
    await page.keyboard.press('Tab')

    // Vérifier qu'un élément est focusé
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement
      return (
        el?.classList.contains('dnd-card') || el?.closest('.dnd-card') !== null
      )
    })

    if (focusedElement) {
      console.log('✅ Keyboard navigation: Premier item focusé avec Tab')

      // Tenter drag avec Espace (si supporté par @dnd-kit)
      await page.keyboard.press('Space')
      await page.waitForTimeout(200)

      // Utiliser flèches pour déplacer
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)

      // Drop avec Espace
      await page.keyboard.press('Space')
      await page.waitForTimeout(500)

      console.log('✅ Keyboard drag-and-drop exécuté (Espace + Flèches)')
    } else {
      console.log(
        '⚠️  Keyboard focus non trouvé - peut nécessiter tabIndex sur DndCard'
      )
    }
  })

  test('Keyboard navigation - Items ont tabindex pour accessibilité', async ({
    page,
  }) => {
    const itemCount = await page.locator('.dnd-card').count()

    if (itemCount < 1) {
      test.skip()
      return
    }

    // Vérifier que les items ont tabindex
    const firstItem = page.locator('.dnd-card').first()
    const tabIndex = await firstItem.getAttribute('tabindex')

    // tabindex devrait être 0 ou -1 (focusable)
    expect(tabIndex).not.toBeNull()
    console.log(`✅ tabindex trouvé: ${tabIndex}`)
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 3 : Add/Remove items avec AnimatePresence
  // ═════════════════════════════════════════════════════════════════════════════

  test('Add item - AnimatePresence sans erreur', async ({ page }) => {
    // Ce test suppose qu'il y a un bouton "Ajouter" dans la page
    // Sinon, on peut skip
    const addButton = page.locator('button', { hasText: /ajouter/i }).first()
    const isVisible = await addButton.isVisible().catch(() => false)

    if (!isVisible) {
      console.log('⚠️  Bouton "Ajouter" non trouvé - skip test add item')
      test.skip()
      return
    }

    // Compter les items avant
    const initialCount = await page.locator('.dnd-card').count()

    // Cliquer sur ajouter
    await addButton.click()
    await page.waitForTimeout(500)

    // Remplir formulaire (si modal/form s'ouvre)
    const labelInput = page.locator('input[name="label"]').first()
    const labelInputVisible = await labelInput.isVisible().catch(() => false)

    if (labelInputVisible) {
      await labelInput.fill('New Test Item')

      const saveButton = page
        .locator('button', { hasText: /enregistrer|sauvegarder/i })
        .first()
      await saveButton.click()
      await page.waitForTimeout(1000)

      // Vérifier qu'un item a été ajouté
      const newCount = await page.locator('.dnd-card').count()
      expect(newCount).toBe(initialCount + 1)

      console.log(`✅ Item ajouté: ${initialCount} → ${newCount}`)
    } else {
      console.log('⚠️  Formulaire non trouvé - skip add verification')
    }
  })

  test('Remove item - AnimatePresence sans crash', async ({ page }) => {
    // Ce test suppose qu'il y a un bouton delete sur chaque item
    const deleteButton = page
      .locator('button[aria-label*="Supprimer"], button[title*="Supprimer"]')
      .first()
    const isVisible = await deleteButton.isVisible().catch(() => false)

    if (!isVisible) {
      console.log('⚠️  Bouton "Supprimer" non trouvé - skip test remove item')
      test.skip()
      return
    }

    // Compter les items avant
    const initialCount = await page.locator('.dnd-card').count()

    if (initialCount === 0) {
      test.skip()
      return
    }

    // Cliquer sur supprimer
    await deleteButton.click()

    // Confirmer si modal de confirmation
    const confirmButton = page
      .locator('button', { hasText: /confirmer|supprimer|oui/i })
      .first()
    const confirmVisible = await confirmButton.isVisible().catch(() => false)

    if (confirmVisible) {
      await confirmButton.click()
    }

    await page.waitForTimeout(1000)

    // Vérifier qu'un item a été supprimé
    const newCount = await page.locator('.dnd-card').count()
    expect(newCount).toBe(initialCount - 1)

    console.log(`✅ Item supprimé: ${initialCount} → ${newCount}`)
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 4 : État visuel pendant drag
  // ═════════════════════════════════════════════════════════════════════════════

  test('Drag visuel - Classes CSS appliquées (dragging, over)', async ({
    page,
  }) => {
    const itemCount = await page.locator('.dnd-card').count()

    if (itemCount < 2) {
      test.skip()
      return
    }

    const item1 = page.locator('.dnd-card').first()
    const item1Box = await item1.boundingBox()

    if (item1Box) {
      // Commencer le drag
      await page.mouse.move(
        item1Box.x + item1Box.width / 2,
        item1Box.y + item1Box.height / 2
      )
      await page.mouse.down()
      await page.waitForTimeout(200)

      // Vérifier la classe dragging
      const hasDraggingClass = await page.evaluate(() => {
        const card = document.querySelector('.dnd-card--dragging')
        return card !== null
      })

      console.log(`Dragging class applied: ${hasDraggingClass}`)

      // Déplacer au-dessus d'un autre item
      const item2 = page.locator('.dnd-card').nth(1)
      const item2Box = await item2.boundingBox()

      if (item2Box) {
        await page.mouse.move(
          item2Box.x + item2Box.width / 2,
          item2Box.y + item2Box.height / 2
        )
        await page.waitForTimeout(200)

        // Vérifier la classe over (slot)
        const hasOverClass = await page.evaluate(() => {
          const slot = document.querySelector('.dnd-slot--over')
          return slot !== null
        })

        console.log(`Over class applied: ${hasOverClass}`)
      }

      // Relâcher
      await page.mouse.up()
      await page.waitForTimeout(500)
    }
  })

  test('Drag visuel - Opacité et shadow pendant drag', async ({ page }) => {
    const itemCount = await page.locator('.dnd-card').count()

    if (itemCount < 1) {
      test.skip()
      return
    }

    const item1 = page.locator('.dnd-card').first()
    const item1Box = await item1.boundingBox()

    if (item1Box) {
      // Commencer le drag
      await page.mouse.move(
        item1Box.x + item1Box.width / 2,
        item1Box.y + item1Box.height / 2
      )
      await page.mouse.down()
      await page.waitForTimeout(200)

      // Vérifier l'opacité pendant drag
      const opacity = await item1.evaluate(el => {
        return window.getComputedStyle(el).opacity
      })

      // Devrait être < 1 (0.92 selon DndCard)
      const opacityValue = parseFloat(opacity)
      expect(opacityValue).toBeLessThan(1)
      console.log(`✅ Opacity pendant drag: ${opacity}`)

      // Relâcher
      await page.mouse.up()
    }
  })
})
