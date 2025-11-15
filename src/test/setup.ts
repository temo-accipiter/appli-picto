// src/test/setup.ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'
import { afterAll, afterEach, beforeAll } from 'vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// ========================================
// i18next Setup (Mock translations)
// ========================================
i18n.use(initReactI18next).init({
  lng: 'fr',
  fallbackLng: 'fr',
  ns: ['translation'],
  defaultNS: 'translation',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    fr: {
      translation: {
        // Mock minimal des clés utilisées dans les tests
        'common.loading': 'Chargement...',
        'common.save': 'Enregistrer',
        'common.cancel': 'Annuler',
        'common.delete': 'Supprimer',
        'edition.title': 'Édition',
        'edition.confettiEnabled': 'Confettis activés',
        'edition.confettiDisabled': 'Confettis désactivés',
        'edition.showReward': 'Afficher récompense',
        'edition.showTimeTimer': 'Afficher Time Timer',
        'edition.hideTimeTimer': 'Masquer Time Timer',
        'edition.showTrain': 'Afficher train',
        'edition.toastsEnabled': 'Notifications activées',
        'edition.toastsDisabled': 'Notifications désactivées',
        'settings.title': 'Paramètres',
        'tasks.title': 'Tâches',
        'rewards.title': 'Récompenses',
        // Profil page translations
        'profil.myProfile': 'Mon Profil',
        'profil.loading': 'Chargement...',
        'profil.pseudo': 'Pseudo',
        'profil.email': 'Email',
        'profil.city': 'Ville',
        'profil.birthdate': 'Date de naissance',
        'profil.avatar': 'Avatar',
        'profil.save': 'Enregistrer',
        'profil.logout': 'Déconnexion',
        'profil.deleteAccount': 'Supprimer mon compte',
      },
    },
  },
})

// ========================================
// MSW Server Setup (Mock HTTP requests)
// ========================================
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// --- Mocks d'APIs navigateur utiles ---

class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserver
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver || IntersectionObserver

// matchMedia (souvent utilisé par des libs UI)
globalThis.matchMedia =
  globalThis.matchMedia ||
  function () {
    return {
      matches: false,
      media: '',
      onchange: null,
      addListener(): void {}, // deprecated, mais parfois appelé
      removeListener(): void {},
      addEventListener(): void {},
      removeEventListener(): void {},
      dispatchEvent(): boolean {
        return false
      },
    }
  }

// scrollTo no-op (évite certaines erreurs)
globalThis.scrollTo = globalThis.scrollTo || ((): void => {})

// --- Env Vite pour les tests ---
// On étend l'existant au lieu de l'écraser
// Note: import est un mot réservé, on doit utiliser des guillemets
if (!globalThis['import']) {
  globalThis['import'] = { meta: { env: {} } }
}
if (!globalThis['import'].meta) {
  globalThis['import'].meta = { env: {} }
}
if (!globalThis['import'].meta.env) {
  globalThis['import'].meta.env = {}
}

const existingEnv = globalThis['import'].meta.env
globalThis['import'].meta.env = {
  ...existingEnv,
  VITE_SUPABASE_URL: 'http://localhost:54321',
  // Ces deux-là sont lus par ton code (consent/log-consent & URLs absolues)
  VITE_SUPABASE_FUNCTIONS_URL:
    existingEnv.VITE_SUPABASE_FUNCTIONS_URL ||
    'http://localhost:54321/functions/v1',
  VITE_APP_URL: existingEnv.VITE_APP_URL || 'http://localhost:5173',
  VITE_APP_ENV: 'test',
}

// ========================================
// Mock Supabase Realtime (Désactivation WebSocket)
// ========================================
// CRITICAL: Désactiver realtime dans les tests pour éviter les connexions WebSocket
// qui causent des crashes du worker Vitest

// Mock de WebSocket pour éviter les connexions réelles
class MockWebSocket {
  readyState = 0
  onopen = null
  onerror = null
  onclose = null
  onmessage = null

  constructor() {
    // Ne rien faire - pas de connexion réelle
  }

  send(): void {
    // No-op
  }

  close(): void {
    // No-op
  }

  addEventListener(): void {
    // No-op
  }

  removeEventListener(): void {
    // No-op
  }
}

// Remplacer WebSocket globalement pour les tests
if (typeof globalThis !== 'undefined') {
  ;(globalThis as { WebSocket?: unknown }).WebSocket =
    MockWebSocket as unknown as typeof WebSocket
}

// ========================================
// Mock Next.js Navigation Hooks
// ========================================
// CRITICAL: Mock Next.js hooks pour tests unitaires
// useRouter, usePathname, useSearchParams nécessitent App Router context

import { vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children }: { children: unknown; href: string }) => {
    return children
  },
}))

