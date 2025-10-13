import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthContext } from '@/contexts/AuthContext'
import { PermissionsProvider } from '@/contexts/PermissionsContext'
import { supabase } from '@/utils/supabaseClient'
import useRBAC from './useRBAC'

// Mock Supabase
vi.mock('@/utils/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn(function () {
        return this
      }),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

const mockAuthContext = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  authReady: true,
}

const wrapper = ({ children }) => (
  <AuthContext.Provider value={mockAuthContext}>
    <PermissionsProvider>{children}</PermissionsProvider>
  </AuthContext.Provider>
)

describe('useRBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('expose toutes les propriétés de l\'API unifiée', async () => {
    supabase.rpc.mockImplementation(fnName => {
      if (fnName === 'get_my_primary_role') {
        return Promise.resolve({ data: { role_name: 'free' }, error: null })
      }
      if (fnName === 'get_my_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_usage_fast') {
        return Promise.resolve({
          data: {
            quotas: [
              { quota_type: 'max_tasks', quota_limit: 5, quota_period: 'total' },
            ],
            usage: { tasks: 2 },
          },
          error: null,
        })
      }
    })

    const { result } = renderHook(() => useRBAC(), { wrapper })

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    // Vérifier que toutes les propriétés sont présentes
    expect(result.current).toHaveProperty('ready')
    expect(result.current).toHaveProperty('loading')
    expect(result.current).toHaveProperty('role')
    expect(result.current).toHaveProperty('isVisitor')
    expect(result.current).toHaveProperty('isAdmin')
    expect(result.current).toHaveProperty('isFree')
    expect(result.current).toHaveProperty('isSubscriber')
    expect(result.current).toHaveProperty('can')
    expect(result.current).toHaveProperty('canAll')
    expect(result.current).toHaveProperty('canAny')
    expect(result.current).toHaveProperty('quotas')
    expect(result.current).toHaveProperty('usage')
    expect(result.current).toHaveProperty('canCreate')
    expect(result.current).toHaveProperty('canCreateTask')
    expect(result.current).toHaveProperty('canCreateReward')
    expect(result.current).toHaveProperty('canCreateCategory')
    expect(result.current).toHaveProperty('getQuotaInfo')
    expect(result.current).toHaveProperty('reload')
  })

  it('retourne les quotas pour free account', async () => {
    supabase.rpc.mockImplementation(fnName => {
      if (fnName === 'get_my_primary_role') {
        return Promise.resolve({ data: { role_name: 'free' }, error: null })
      }
      if (fnName === 'get_my_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_usage_fast') {
        return Promise.resolve({
          data: {
            quotas: [
              { quota_type: 'max_tasks', quota_limit: 5, quota_period: 'total' },
              {
                quota_type: 'max_rewards',
                quota_limit: 2,
                quota_period: 'total',
              },
            ],
            usage: { tasks: 2, rewards: 1 },
          },
          error: null,
        })
      }
    })

    const { result } = renderHook(() => useRBAC(), { wrapper })

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    expect(result.current.isFree).toBe(true)
    expect(result.current.quotas).toHaveProperty('max_tasks')
    expect(result.current.quotas.max_tasks.limit).toBe(5)
    expect(result.current.usage.max_tasks).toBe(2)
  })

  it('canCreateTask retourne true si sous la limite', async () => {
    supabase.rpc.mockImplementation(fnName => {
      if (fnName === 'get_my_primary_role') {
        return Promise.resolve({ data: { role_name: 'free' }, error: null })
      }
      if (fnName === 'get_my_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_usage_fast') {
        return Promise.resolve({
          data: {
            quotas: [
              { quota_type: 'max_tasks', quota_limit: 5, quota_period: 'total' },
            ],
            usage: { tasks: 2 },
          },
          error: null,
        })
      }
    })

    const { result } = renderHook(() => useRBAC(), { wrapper })

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    expect(result.current.canCreateTask()).toBe(true)
  })

  it('canCreateTask retourne false si à la limite', async () => {
    supabase.rpc.mockImplementation(fnName => {
      if (fnName === 'get_my_primary_role') {
        return Promise.resolve({ data: { role_name: 'free' }, error: null })
      }
      if (fnName === 'get_my_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_usage_fast') {
        return Promise.resolve({
          data: {
            quotas: [
              { quota_type: 'max_tasks', quota_limit: 5, quota_period: 'total' },
            ],
            usage: { tasks: 5 },
          },
          error: null,
        })
      }
    })

    const { result } = renderHook(() => useRBAC(), { wrapper })

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    expect(result.current.canCreateTask()).toBe(false)
  })

  it('getQuotaInfo retourne les bonnes informations', async () => {
    supabase.rpc.mockImplementation(fnName => {
      if (fnName === 'get_my_primary_role') {
        return Promise.resolve({ data: { role_name: 'free' }, error: null })
      }
      if (fnName === 'get_my_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_usage_fast') {
        return Promise.resolve({
          data: {
            quotas: [
              { quota_type: 'max_tasks', quota_limit: 5, quota_period: 'total' },
            ],
            usage: { tasks: 3 },
          },
          error: null,
        })
      }
    })

    const { result } = renderHook(() => useRBAC(), { wrapper })

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    const info = result.current.getQuotaInfo('task')
    expect(info).toEqual({
      limit: 5,
      current: 3,
      remaining: 2,
      percentage: 60,
      isAtLimit: false,
      isNearLimit: false,
    })
  })

  it('admin a toujours canCreateTask = true', async () => {
    supabase.rpc.mockImplementation(fnName => {
      if (fnName === 'get_my_primary_role') {
        return Promise.resolve({ data: { role_name: 'admin' }, error: null })
      }
      if (fnName === 'get_my_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_usage_fast') {
        return Promise.resolve({
          data: { quotas: [], usage: {} },
          error: null,
        })
      }
    })

    const { result } = renderHook(() => useRBAC(), { wrapper })

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    expect(result.current.isAdmin).toBe(true)
    expect(result.current.canCreateTask()).toBe(true)
  })

  it('subscriber a toujours canCreateTask = true', async () => {
    supabase.rpc.mockImplementation(fnName => {
      if (fnName === 'get_my_primary_role') {
        return Promise.resolve({ data: { role_name: 'abonne' }, error: null })
      }
      if (fnName === 'get_my_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_usage_fast') {
        return Promise.resolve({
          data: { quotas: [], usage: {} },
          error: null,
        })
      }
    })

    const { result } = renderHook(() => useRBAC(), { wrapper })

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    expect(result.current.isSubscriber).toBe(true)
    expect(result.current.canCreateTask()).toBe(true)
  })
})
