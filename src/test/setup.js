// src/test/setup.js
import '@testing-library/jest-dom'

// --- Mocks d'APIs navigateur utiles ---

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
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
      addListener() {}, // deprecated, mais parfois appelé
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {},
    }
  }

// scrollTo no-op (évite certaines erreurs)
globalThis.scrollTo = globalThis.scrollTo || (() => {})

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
