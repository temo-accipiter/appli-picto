// playwright.config.js
// Configuration Playwright pour tests E2E Appli-Picto

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // Dossier tests E2E
  testDir: './tests/e2e',

  // Timeout par test (30s pour uploads)
  timeout: 30000,

  // Nombre de retry en cas d'échec
  retries: process.env.CI ? 2 : 0,

  // Parallélisme (1 worker en local pour stabilité)
  workers: process.env.CI ? 2 : 1,

  // Reporter
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  // Options globales
  use: {
    // Base URL (serveur dev local)
    baseURL: 'http://localhost:5173',

    // Timeout actions (10s)
    actionTimeout: 10000,

    // Timeout navigation (15s)
    navigationTimeout: 15000,

    // Screenshots en cas d'échec
    screenshot: 'only-on-failure',

    // Vidéos en cas d'échec
    video: 'retain-on-failure',

    // Trace en cas d'échec
    trace: 'retain-on-failure',
  },

  // Projets (navigateurs)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Serveur web (démarrer vite dev si pas déjà lancé)
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:5173',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
