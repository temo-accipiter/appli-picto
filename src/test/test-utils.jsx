// src/test/test-utils.jsx
/**
 * 🧪 Test Utilities - Helpers pour tests React
 *
 * Wrapper avec tous les providers nécessaires pour tester les composants
 * qui dépendent de contexts (Auth, Permissions, Toast, etc.)
 *
 * Usage :
 * import { renderWithProviders } from '@/test/test-utils'
 *
 * renderWithProviders(<MyComponent />)
 */

import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import {
  AuthProvider,
  ToastProvider,
  PermissionsProvider,
  DisplayProvider,
  LoadingProvider,
} from '@/contexts'

/**
 * Wrapper avec tous les providers
 */
export function AllTheProviders({ children }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionsProvider>
          <DisplayProvider>
            <LoadingProvider>
              <ToastProvider>{children}</ToastProvider>
            </LoadingProvider>
          </DisplayProvider>
        </PermissionsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

/**
 * Helper pour render avec providers
 *
 * @param {ReactElement} ui - Composant à tester
 * @param {Object} options - Options RTL
 * @returns {Object} - Résultat RTL + helper rerender
 */
export function renderWithProviders(ui, options = {}) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

/**
 * Mock user pour tests
 */
export const mockTestUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
}

/**
 * Mock admin user pour tests
 */
export const mockAdminUser = {
  id: 'admin-user-456',
  email: 'admin@example.com',
  created_at: '2024-01-01T00:00:00Z',
}

// Re-export tout de RTL
export * from '@testing-library/react'

// Export custom render comme default
export { renderWithProviders as render }
