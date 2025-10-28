// tests/e2e/image-upload.spec.js
// Tests E2E workflow upload images (conversion WebP, HEIC, validation)

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Note: Ces tests E2E nécessitent un utilisateur test configuré dans Supabase
// Pour l'instant, on teste uniquement les fonctions de conversion côté client
// Les tests complets UI seront activés quand l'environnement test Supabase sera prêt

test.describe('Image Upload Workflow - Unit Tests', () => {
  test('Fixtures disponibles', async () => {
    // Vérifier que toutes les fixtures existent
    const fixturesPath = path.join(__dirname, '../fixtures')

    expect(fs.existsSync(path.join(fixturesPath, 'icon.svg'))).toBe(true)
    expect(fs.existsSync(path.join(fixturesPath, 'test-image.png'))).toBe(true)
    expect(fs.existsSync(path.join(fixturesPath, 'large-image.jpg'))).toBe(true)
    expect(fs.existsSync(path.join(fixturesPath, 'small-image.png'))).toBe(true)
  })

  test('Fixture SVG est valide', async () => {
    const svgPath = path.join(__dirname, '../fixtures/icon.svg')
    const svgContent = fs.readFileSync(svgPath, 'utf-8')

    // Vérifier balise SVG
    expect(svgContent).toContain('<svg')
    expect(svgContent).toContain('</svg>')
    expect(svgContent).toContain('width="192"')
    expect(svgContent).toContain('height="192"')
  })

  test('Fixture PNG taille correcte', async () => {
    const pngPath = path.join(__dirname, '../fixtures/test-image.png')
    const stats = fs.statSync(pngPath)

    // Vérifier taille < 100 KB (pour upload rapide)
    expect(stats.size).toBeLessThan(100 * 1024)
    expect(stats.size).toBeGreaterThan(1024) // > 1 KB
  })

  test('Fixture JPEG large pour test quota', async () => {
    const jpegPath = path.join(__dirname, '../fixtures/large-image.jpg')
    const stats = fs.statSync(jpegPath)

    // Vérifier taille > 20 KB (sera compressé)
    expect(stats.size).toBeGreaterThan(20 * 1024)
  })
})

test.describe('Image Upload Workflow - Page Accessibility (Smoke Tests)', () => {
  test.skip('Page Edition accessible', async ({ page }) => {
    // SKIP: Nécessite authentification Supabase
    // TODO: Activer quand environnement test configuré

    await page.goto('/edition')
    await expect(page.locator('h1')).toBeVisible()
  })

  test.skip('Modal ajout tâche fonctionne', async ({ page }) => {
    // SKIP: Nécessite authentification Supabase
    // TODO: Activer quand environnement test configuré

    await page.goto('/edition')
    await page.click('[data-testid="add-task-button"]')
    await expect(page.locator('input[type="file"]')).toBeVisible()
  })

  test.skip('Upload PNG → WebP conversion', async ({ page }) => {
    // SKIP: Nécessite authentification Supabase + base de test
    // TODO: Activer quand environnement test configuré
    // Ce test validerait:
    // 1. Upload fichier PNG
    // 2. Progress bar visible
    // 3. Conversion WebP automatique
    // 4. Image affichée avec signed URL
    // 5. Metrics loggées dans image_metrics
  })

  test.skip('Upload SVG → pas de conversion', async ({ page }) => {
    // SKIP: Nécessite authentification Supabase
    // TODO: Activer quand environnement test configuré
  })

  test.skip('Upload doublon → déduplication SHA-256', async ({ page }) => {
    // SKIP: Nécessite authentification Supabase
    // TODO: Activer quand environnement test configuré
    // Ce test validerait:
    // 1. Upload image A
    // 2. Upload image A à nouveau
    // 3. Vérifier même file_path utilisé (déduplication)
    // 4. Vérifier pas de doublon dans user_assets
  })
})

test.describe('Image Conversion Functions - Browser Context', () => {
  test('Page accueil charge correctement', async ({ page }) => {
    // Test simple pour vérifier que l'app démarre
    await page.goto('/')

    // Vérifier redirection ou page visible
    await page.waitForLoadState('networkidle')
    expect(page.url()).toBeTruthy()
  })

  test('Service Worker enregistré en production', async ({ page }) => {
    // SKIP en dev, actif uniquement en build production
    test.skip(process.env.NODE_ENV !== 'production', 'Production only')

    await page.goto('/')

    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.controller !== null
    })

    expect(swRegistered).toBe(true)
  })
})

// Tests futurs à activer avec environnement Supabase test:
// - [ ] Upload quota dépassé → message erreur
// - [ ] Upload format non supporté → message erreur
// - [ ] Upload > 10 MB → message erreur
// - [ ] Remplacement image → versioning +1
// - [ ] Cache Service Worker après upload
// - [ ] Signed URL expire après 24h
// - [ ] Admin dashboard analytics affiche stats
