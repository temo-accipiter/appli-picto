import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useSessions from './useSessions'

const fromMock = vi.fn()
const rpcMock = vi.fn()

vi.mock('@/utils/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}))

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })

  return { promise, resolve }
}

function createQueryBuilder(
  responses: Array<Promise<{ data: unknown; error: unknown }>>
) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    abortSignal: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => {
      const next = responses.shift()
      return next ?? Promise.resolve({ data: null, error: null })
    }),
  }

  return builder
}

describe('useSessions', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
  })

  it('garde loading=false pendant un refresh sur le meme contexte quand une session existe deja', async () => {
    const initialFetch = createDeferred<{ data: unknown; error: unknown }>()
    const refreshFetch = createDeferred<{ data: unknown; error: unknown }>()
    const responses = [initialFetch.promise, refreshFetch.promise]

    fromMock.mockImplementation(() => createQueryBuilder(responses))

    const seenLoadingStates: boolean[] = []

    const { result } = renderHook(() => {
      const hook = useSessions('child-1', 'timeline-1')
      seenLoadingStates.push(hook.loading)
      return hook
    })

    expect(seenLoadingStates).toContain(true)

    await act(async () => {
      initialFetch.resolve({
        data: {
          id: 'session-1',
          child_profile_id: 'child-1',
          timeline_id: 'timeline-1',
          state: 'active_preview',
          steps_total_snapshot: null,
          epoch: 1,
        },
        error: null,
      })
      await initialFetch.promise
    })

    await waitFor(() => {
      expect(result.current.session?.id).toBe('session-1')
      expect(result.current.loading).toBe(false)
    })

    seenLoadingStates.length = 0

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledTimes(2)
    })

    expect(seenLoadingStates).not.toContain(true)
    expect(result.current.loading).toBe(false)

    await act(async () => {
      refreshFetch.resolve({
        data: {
          id: 'session-1',
          child_profile_id: 'child-1',
          timeline_id: 'timeline-1',
          state: 'active_started',
          steps_total_snapshot: 3,
          epoch: 1,
        },
        error: null,
      })
      await refreshFetch.promise
    })

    await waitFor(() => {
      expect(result.current.session?.state).toBe('active_started')
      expect(result.current.loading).toBe(false)
    })

    expect(seenLoadingStates).not.toContain(true)
  })

  it('utilise la fonction DB de reset uniquement pour une session active_started', async () => {
    const initialFetch = createDeferred<{ data: unknown; error: unknown }>()
    const responses = [initialFetch.promise]

    fromMock.mockImplementation(() => createQueryBuilder(responses))
    rpcMock.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useSessions('child-1', 'timeline-1'))

    await act(async () => {
      initialFetch.resolve({
        data: {
          id: 'session-1',
          child_profile_id: 'child-1',
          timeline_id: 'timeline-1',
          state: 'active_started',
          steps_total_snapshot: 3,
          epoch: 1,
        },
        error: null,
      })
      await initialFetch.promise
    })

    await waitFor(() => {
      expect(result.current.session?.state).toBe('active_started')
    })

    await act(async () => {
      await result.current.resetSession()
    })

    expect(rpcMock).toHaveBeenCalledWith('hard_reset_timeline_session', {
      p_timeline_id: 'timeline-1',
    })
  })
})
