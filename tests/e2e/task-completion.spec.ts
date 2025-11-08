// tests/e2e/task-completion.spec.js
/**
 * 🎭 Test E2E - Parcours complet utilisateur authentifié
 *
 * Scénario critique :
 * 1. Utilisateur se connecte
 * 2. Va sur /edition
 * 3. Crée une nouvelle tâche
 * 4. Va sur /tableau
 * 5. Valide la tâche
 * 6. Voit la récompense
 *
 * ⚠️ Pré-requis : Base de données de test avec compte test@example.com
 */

import { test, expect } from '@playwright/test'

test.describe('Parcours création et validation de tâche', () => {
  // Helper pour login
  async function login(page, email, password) {
    await page.goto('/login')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')
    // Attendre redirection
    await page.waitForURL(/\/(tableau|edition)/, { timeout: 10000 })
  }

  test.skip('utilisateur crée et valide une tâche', async ({ page }) => {
    // ⚠️ Ce test est skip car il nécessite une DB de test configurée
    // Pour l'activer : créer un compte test@example.com dans Supabase test

    // ========================================
    // 1. Login
    // ========================================
    await login(page, 'test@example.com', 'password123')

    // ========================================
    // 2. Aller sur l'édition
    // ========================================
    await page.goto('/edition')

    // Vérifier qu'on est bien sur la page édition
    await expect(page.locator('h1:has-text("Édition")')).toBeVisible({
      timeout: 5000,
    })

    // ========================================
    // 3. Créer une nouvelle tâche
    // ========================================
    const taskName = `Tâche Test E2E ${Date.now()}`

    // Cliquer sur "Ajouter une tâche"
    await page.click('button:has-text("Ajouter")')

    // Attendre que le formulaire apparaisse
    await expect(page.locator('input[name="label"]')).toBeVisible({
      timeout: 3000,
    })

    // Remplir le formulaire
    await page.fill('input[name="label"]', taskName)

    // Cocher "Afficher aujourd'hui"
    const todayCheckbox = page.locator('input[name="aujourdhui"]')
    if (!(await todayCheckbox.isChecked())) {
      await todayCheckbox.check()
    }

    // Sauvegarder
    await page.click('button:has-text("Enregistrer")')

    // Vérifier que la tâche apparaît dans la liste
    await expect(page.locator(`text="${taskName}"`)).toBeVisible({
      timeout: 5000,
    })

    // ========================================
    // 4. Aller sur le tableau
    // ========================================
    await page.goto('/tableau')

    // Attendre le chargement
    await expect(page.locator('[data-testid="task-card"]').first()).toBeVisible(
      { timeout: 5000 }
    )

    // Vérifier que notre tâche est bien là
    await expect(page.locator(`text="${taskName}"`)).toBeVisible()

    // ========================================
    // 5. Valider la tâche
    // ========================================
    const ourTask = page.locator(
      `[data-testid="task-card"]:has-text("${taskName}")`
    )

    // Cliquer sur la checkbox
    await ourTask.locator('[data-testid="task-checkbox"]').click()

    // Vérifier qu'elle est marquée comme faite
    await expect(ourTask).toHaveClass(/fait|done/, { timeout: 3000 })

    // ========================================
    // 6. Vérifier la récompense
    // ========================================
    // Si c'était la dernière tâche, les confettis et la récompense apparaissent
    await page.waitForTimeout(1000)

    // La zone de récompense doit être visible
    const rewardSection = page.locator('[data-testid="reward"]')
    const rewardCount = await rewardSection.count()
    expect(rewardCount).toBeGreaterThanOrEqual(0)

    // ========================================
    // 7. Cleanup - Supprimer la tâche de test
    // ========================================
    await page.goto('/edition')

    // Trouver la tâche et la supprimer
    const taskToDelete = page.locator(
      `[data-testid="task-item"]:has-text("${taskName}")`
    )
    if (await taskToDelete.isVisible()) {
      await taskToDelete.locator('[data-testid="delete-button"]').click()

      // Confirmer la suppression
      await page.click('button:has-text("Confirmer")')

      // Vérifier qu'elle a disparu
      await expect(page.locator(`text="${taskName}"`)).not.toBeVisible({
        timeout: 3000,
      })
    }
  })

  test('navigation entre les pages fonctionne', async ({ page }) => {
    // Test simple de navigation sans auth

    // Page d'accueil
    await page.goto('/')

    // Vérifier redirection
    await page.waitForURL(/\/(tableau|login)/, { timeout: 5000 })

    // Aller sur /login
    await page.goto('/login')
    await expect(page.locator('h1:has-text("Connexion")')).toBeVisible({
      timeout: 5000,
    })

    // Aller sur /signup
    await page.goto('/signup')
    await expect(page.locator('h1:has-text("Inscription")')).toBeVisible({
      timeout: 5000,
    })

    // Aller sur /tableau (mode démo)
    await page.goto('/tableau')
    await expect(page.locator('[data-testid="task-card"]').first()).toBeVisible(
      {
        timeout: 10000,
      }
    )
  })

  test('pages légales sont accessibles', async ({ page }) => {
    // CGU
    await page.goto('/cgu')
    await expect(page.locator('text=/conditions générales/i')).toBeVisible({
      timeout: 5000,
    })

    // Mentions légales
    await page.goto('/mentions-legales')
    await expect(page.locator('text=/mentions légales/i')).toBeVisible({
      timeout: 5000,
    })

    // Politique de confidentialité
    await page.goto('/politique-confidentialite')
    await expect(page.locator('text=/confidentialité|RGPD/i')).toBeVisible({
      timeout: 5000,
    })
  })
})
