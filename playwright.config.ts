// playwright.config.ts
/**
 * 🎭 Configuration Playwright - Tests E2E
 *
 * Documentation: https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',

  // Timeout par test
  timeout: 30000,

  // Configuration des assertions
  expect: {
    timeout: 5000,
  },

  // Parallélisme
  fullyParallel: true,

  // Retry en cas d'échec
  retries: process.env.CI ? 2 : 0,

  // Workers (parallélisme)
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // Options partagées pour tous les tests
  use: {
    // URL de base
    baseURL: 'http://localhost:5173',

    // Collecter trace en cas d'échec
    trace: 'on-first-retry',

    // Screenshots
    screenshot: 'only-on-failure',

    // Video
    video: 'retain-on-failure',

    // Timeout actions
    actionTimeout: 10000,
  },

  // Configuration des projets (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Tests mobile (optionnel)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Démarrer le serveur dev avant les tests
  webServer: {
    command: 'yarn dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
