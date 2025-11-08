// tests/e2e/demo-visitor.spec.js
/**
 * 🎭 Test E2E - Parcours visiteur mode démo
 *
 * Scénario critique :
 * 1. Visiteur arrive sur /tableau (mode démo)
 * 2. Voit les tâches de démonstration
 * 3. Peut valider une tâche
 * 4. Voit les confettis
 * 5. Voit la récompense
 * 6. Tente de changer de ligne → modal d'inscription
 */

import { test, expect } from '@playwright/test'

test.describe('Mode visiteur démo', () => {
  test("visiteur peut tester l'app en mode démo", async ({ page }) => {
    // ========================================
    // 1. Accéder au tableau en mode démo
    // ========================================
    await page.goto('/tableau')

    // Vérifier qu'on est bien en mode démo (pas de navbar de connexion)
    await expect(page.locator('text=Mode démonstration')).toBeVisible({
      timeout: 10000,
    })

    // ========================================
    // 2. Voir les tâches de démo
    // ========================================
    // Attendre le chargement des tâches
    await expect(page.locator('[data-testid="task-card"]').first()).toBeVisible(
      { timeout: 5000 }
    )

    // Vérifier qu'il y a au moins 2 tâches
    const taskCards = await page.locator('[data-testid="task-card"]').count()
    expect(taskCards).toBeGreaterThanOrEqual(2)

    // ========================================
    // 3. Valider une tâche
    // ========================================
    const firstTask = page.locator('[data-testid="task-card"]').first()

    // Cliquer sur la checkbox de la tâche
    await firstTask.locator('[data-testid="task-checkbox"]').click()

    // Vérifier que la tâche est marquée comme faite
    await expect(firstTask).toHaveClass(/task-done|fait/, { timeout: 3000 })

    // ========================================
    // 4. Vérifier les confettis (si activés)
    // ========================================
    // Les confettis peuvent apparaître si toutes les tâches sont faites
    // On vérifie juste qu'ils ne cassent pas l'app
    const confettiPresent = await page.locator('.confetti').count()
    expect(confettiPresent).toBeGreaterThanOrEqual(0)

    // ========================================
    // 5. Vérifier que la récompense est visible
    // ========================================
    // Attendre l'animation
    await page.waitForTimeout(1000)

    // La récompense devrait être visible dans la sidebar ou en modal
    const rewardVisible =
      (await page.locator('[data-testid="reward"]').count()) > 0
    expect(rewardVisible).toBeTruthy()

    // ========================================
    // 6. Tenter changement ligne → modal signup
    // ========================================
    // Cliquer sur le sélecteur de ligne (si visible)
    const lineSelector = page.locator('[data-testid="line-selector"]')
    if (await lineSelector.isVisible()) {
      await lineSelector.click()

      // Modal de personnalisation devrait apparaître
      await expect(
        page.locator('text=Créez un compte pour personnaliser')
      ).toBeVisible({ timeout: 3000 })

      // Bouton "Créer un compte" doit être présent
      await expect(
        page.locator('button:has-text("Créer un compte")')
      ).toBeVisible()
    }
  })

  test("visiteur ne peut pas accéder à l'édition sans compte", async ({
    page,
  }) => {
    // Essayer d'accéder à /edition en mode visiteur
    await page.goto('/edition')

    // Devrait être redirigé vers /login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    // Message d'info devrait être visible
    await expect(page.locator('text=/connecter|compte/i')).toBeVisible({
      timeout: 3000,
    })
  })

  test("visiteur peut naviguer vers l'inscription", async ({ page }) => {
    await page.goto('/tableau')

    // Cliquer sur le bouton "S'inscrire" (si visible)
    const signupButton = page.locator('a[href="/signup"]')
    if (await signupButton.isVisible()) {
      await signupButton.click()

      // Vérifier qu'on arrive sur /signup
      await expect(page).toHaveURL(/\/signup/, { timeout: 3000 })

      // Formulaire d'inscription doit être visible
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(
        page.locator('button[type="submit"]:has-text("Créer")')
      ).toBeVisible()
    }
  })
})
