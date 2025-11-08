// src/test/mocks/server.ts
/**
 * 🖥️ MSW Server - Tests Node.js (Vitest)
 *
 * Démarre le serveur MSW pour intercepter les requêtes HTTP dans les tests
 *
 * Usage dans les tests :
 * - beforeAll(() => server.listen())
 * - afterEach(() => server.resetHandlers())
 * - afterAll(() => server.close())
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
