// src/test/test-utils.tsx
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

import { render, type RenderOptions } from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import {
  AuthProvider,
  ToastProvider,
  PermissionsProvider,
  DisplayProvider,
  LoadingProvider,
} from '@/contexts'

/**
 * Mock User type pour tests
 */
export interface MockUser {
  id: string
  email: string
  created_at: string
}

/**
 * Wrapper avec tous les providers
 */
interface AllTheProvidersProps {
  children: ReactNode
}

export function AllTheProviders({ children }: AllTheProvidersProps) {
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
 * @param ui - Composant à tester
 * @param options - Options RTL
 * @returns Résultat RTL + helper rerender
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

/**
 * Mock user pour tests
 */
export const mockTestUser: MockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
}

/**
 * Mock admin user pour tests
 */
export const mockAdminUser: MockUser = {
  id: 'admin-user-456',
  email: 'admin@example.com',
  created_at: '2024-01-01T00:00:00Z',
}

// Re-export tout de RTL
export * from '@testing-library/react'

// Export custom render comme default
export { renderWithProviders as render }
