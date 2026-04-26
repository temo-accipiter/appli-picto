// playwright.visual.config.ts
/**
 * 🎭 Configuration Playwright — Tests VRT (Visual Regression Testing)
 *
 * Config dédiée à la baseline visuelle — Phase 0 Étape 3.
 * Ne modifie PAS playwright.config.ts (tests E2E fonctionnels).
 *
 * Différences vs playwright.config.ts :
 *  - 2 projets uniquement : chromium + Mobile Chrome (stabilité inter-browser)
 *  - workers: 1 + fullyParallel: false → screenshots sériaux (évite les artefacts)
 *  - retries: 0 → pas de retry en VRT (diff stricte = échec immédiat)
 *  - timeout 60s → captures lentes tolérées
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/visual',

  // Timeout par test (VRT peut être lent sur animations / networkidle)
  timeout: 60000,

  // Assertions
  expect: {
    timeout: 10000,
  },

  // Sérialisation obligatoire pour screenshots stables
  fullyParallel: false,

  // Pas de retry — un écart = une vraie régression
  retries: 0,

  // 1 seul worker pour éviter les artefacts de parallélisme
  workers: 1,

  // Reporter séparé du E2E fonctionnel
  reporter: [
    ['html', { outputFolder: 'playwright-report-visual' }],
    ['list'],
  ],

  // Options partagées
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    actionTimeout: 15000,
  },

  // Chromium desktop + Mobile Chrome uniquement
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Réutilise le serveur dev si déjà lancé
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
})
