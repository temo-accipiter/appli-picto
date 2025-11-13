// tests/setup.ts
import { vi } from 'vitest'

// Mock Worker pour heic2any
global.Worker = class Worker {
  constructor() {}
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
} as typeof Worker

// Mock URL.createObjectURL et URL.revokeObjectURL (nécessaires pour heic2any et upload d'images)
global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock matchMedia (bonus)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
