import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PermissionsProvider, usePermissions } from './PermissionsContext'
import { AuthContext } from './AuthContext'
import { supabase } from '@/utils/supabaseClient'

// Mock Supabase
vi.mock('@/utils/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}))

// Mock AuthContext
const mockAuthContext = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  authReady: true,
}

const wrapper = ({ children }) => (
  <AuthContext.Provider value={mockAuthContext}>
    <PermissionsProvider>{children}</PermissionsProvider>
  </AuthContext.Provider>
)

describe('PermissionsContext - canAll & canAny', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('canAll', () => {
    it('retourne true si admin', async () => {
      supabase.rpc.mockImplementation(fnName => {
        if (fnName === 'get_my_primary_role') {
          return Promise.resolve({ data: { role_name: 'admin' }, error: null })
        }
        if (fnName === 'get_my_permissions') {
          return Promise.resolve({ data: [], error: null })
        }
      })

      const { result } = renderHook(() => usePermissions(), { wrapper })

      await waitFor(() => {
        expect(result.current.ready).toBe(true)
      })

      expect(result.current.canAll(['feature1', 'feature2', 'feature3'])).toBe(
        true
      )
    })

    it('retourne true si toutes les permissions sont accordées', async () => {
      supabase.rpc.mockImplementation(fnName => {
        if (fnName === 'get_my_primary_role') {
          return Promise.resolve({ data: { role_name: 'abonne' }, error: null })
        }
        if (fnName === 'get_my_permissions') {
          return Promise.resolve({
            data: [
              { feature_name: 'feature1', can_access: true },
              { feature_name: 'feature2', can_access: true },
              { feature_name: 'feature3', can_access: true },
            ],
            error: null,
          })
        }
      })

      const { result } = renderHook(() => usePermissions(), { wrapper })

      await waitFor(() => {
        expect(result.current.ready).toBe(true)
      })

      expect(result.current.canAll(['feature1', 'feature2', 'feature3'])).toBe(
        true
      )
    })

    it('retourne false si une seule permission manque', async () => {
      supabase.rpc.mockImplementation(fnName => {
        if (fnName === 'get_my_primary_role') {
          return Promise.resolve({ data: { role_name: 'free' }, error: null })
        }
        if (fnName === 'get_my_permissions') {
          return Promise.resolve({
            data: [
              { feature_name: 'feature1', can_access: true },
              { feature_name: 'feature2', can_access: false },
              { feature_name: 'feature3', can_access: true },
            ],
            error: null,
          })
        }
      })

      const { result } = renderHook(() => usePermissions(), { wrapper })

      await waitFor(() => {
        expect(result.current.ready).toBe(true)
      })

      expect(result.current.canAll(['feature1', 'feature2', 'feature3'])).toBe(
        false
      )
    })

    it('retourne false si ready=false', async () => {
      const notReadyAuthContext = {
        user: null,
        authReady: false,
      }

      const notReadyWrapper = ({ children }) => (
        <AuthContext.Provider value={notReadyAuthContext}>
          <PermissionsProvider>{children}</PermissionsProvider>
        </AuthContext.Provider>
      )

      const { result } = renderHook(() => usePermissions(), {
        wrapper: notReadyWrapper,
      })

      expect(result.current.canAll(['feature1'])).toBe(false)
    })

    it('retourne true avec tableau vide', async () => {
      supabase.rpc.mockImplementation(fnName => {
        if (fnName === 'get_my_primary_role') {
          return Promise.resolve({ data: { role_name: 'free' }, error: null })
        }
        if (fnName === 'get_my_permissions') {
          return Promise.resolve({ data: [], error: null })
        }
      })

      const { result } = renderHook(() => usePermissions(), { wrapper })

      await waitFor(() => {
        expect(result.current.ready).toBe(true)
      })

      // .every() retourne true pour tableau vide
      expect(result.current.canAll([])).toBe(true)
    })
  })

  describe('canAny', () => {
    it('retourne true si admin', async () => {
      supabase.rpc.mockImplementation(fnName => {
        if (fnName === 'get_my_primary_role') {
          return Promise.resolve({ data: { role_name: 'admin' }, error: null })
        }
        if (fnName === 'get_my_permissions') {
          return Promise.resolve({ data: [], error: null })
        }
      })

      const { result } = renderHook(() => usePermissions(), { wrapper })

      await waitFor(() => {
        expect(result.current.ready).toBe(true)
      })

      expect(result.current.canAny(['feature1', 'feature2', 'feature3'])).toBe(
        true
      )
    })

    it('retourne true si au moins une permission est accordée', async () => {
      supabase.rpc.mockImplementation(fnName => {
        if (fnName === 'get_my_primary_role') {
          return Promise.resolve({ data: { role_name: 'free' }, error: null })
        }
        if (fnName === 'get_my_permissions') {
          return Promise.resolve({
            data: [
              { feature_name: 'feature1', can_access: false },
              { feature_name: 'feature2', can_access: true },
              { feature_name: 'feature3', can_access: false },
            ],
            error: null,
          })
        }
      })

      const { result } = renderHook(() => usePermissions(), { wrapper })

      await waitFor(() => {
        expect(result.current.ready).toBe(true)
      })

      expect(result.current.canAny(['feature1', 'feature2', 'feature3'])).toBe(
        true
      )
    })

    it('retourne false si aucune permission accordée', async () => {
      supabase.rpc.mockImplementation(fnName => {
        if (fnName === 'get_my_primary_role') {
          return Promise.resolve({ data: { role_name: 'free' }, error: null })
        }
        if (fnName === 'get_my_permissions') {
          return Promise.resolve({
            data: [
              { feature_name: 'feature1', can_access: false },
              { feature_name: 'feature2', can_access: false },
            ],
            error: null,
          })
        }
      })

      const { result } = renderHook(() => usePermissions(), { wrapper })

      await waitFor(() => {
        expect(result.current.ready).toBe(true)
      })

      expect(result.current.canAny(['feature1', 'feature2'])).toBe(false)
    })

    it('retourne false si ready=false', async () => {
      const notReadyAuthContext = {
        user: null,
        authReady: false,
      }

      const notReadyWrapper = ({ children }) => (
        <AuthContext.Provider value={notReadyAuthContext}>
          <PermissionsProvider>{children}</PermissionsProvider>
        </AuthContext.Provider>
      )

      const { result } = renderHook(() => usePermissions(), {
        wrapper: notReadyWrapper,
      })

      expect(result.current.canAny(['feature1'])).toBe(false)
    })

    it('retourne false avec tableau vide', async () => {
      supabase.rpc.mockImplementation(fnName => {
        if (fnName === 'get_my_primary_role') {
          return Promise.resolve({ data: { role_name: 'free' }, error: null })
        }
        if (fnName === 'get_my_permissions') {
          return Promise.resolve({ data: [], error: null })
        }
      })

      const { result } = renderHook(() => usePermissions(), { wrapper })

      await waitFor(() => {
        expect(result.current.ready).toBe(true)
      })

      // .some() retourne false pour tableau vide
      expect(result.current.canAny([])).toBe(false)
    })
  })
})
