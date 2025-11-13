// src/test/setupAxe.ts
// Configuration de jest-axe pour les tests d'accessibilité automatisés

import { configureAxe } from 'jest-axe'

// Configuration personnalisée pour axe-core
// Respecte WCAG 2.2 AA
export const customAxe = configureAxe({
  rules: {
    // Activer toutes les règles WCAG 2.2 AA
    wcag2a: { enabled: true },
    wcag2aa: { enabled: true },
    wcag21a: { enabled: true },
    wcag21aa: { enabled: true },
    wcag22aa: { enabled: true },

    // Règles spécifiques importantes pour Appli-Picto
    'color-contrast': { enabled: true },
    'focus-order': { enabled: true },
    label: { enabled: true },
    'button-name': { enabled: true },
    'image-alt': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'role-img-alt': { enabled: true },
    tabindex: { enabled: true },
    'valid-lang': { enabled: true },
  },
})

// Types pour TypeScript (Vitest)
declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
