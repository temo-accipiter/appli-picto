// playwright.config.ts
/**
 * 🎭 Configuration Playwright - Tests E2E
 *
 * Documentation: https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',

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

  // Workers (parallélisme) - optimisé pour CI
  workers: process.env.CI ? 4 : undefined,

  // Reporter - optimisé pour CI et local
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
        ['github'],
        ['list'],
      ]
    : [['html', { outputFolder: 'playwright-report' }], ['list']],

  // Options partagées pour tous les tests
  use: {
    // URL de base (Next.js dev server)
    baseURL: 'http://localhost:3000',

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

  // Démarrer le serveur dev avant les tests (Next.js)
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
