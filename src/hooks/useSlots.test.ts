import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useSlots from './useSlots'

const fromMock = vi.fn()

vi.mock('@/utils/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
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

function createSlotsQueryBuilder(
  responses: Array<Promise<{ data: unknown; error: unknown }>>
) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    abortSignal: vi.fn(() => {
      const next = responses.shift()
      return next ?? Promise.resolve({ data: [], error: null })
    }),
  }

  return builder
}

function createUpdateBuilder(response: { error: unknown }) {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    then: (resolve: (value: { error: unknown }) => unknown) =>
      Promise.resolve(resolve(response)),
  }

  return builder
}

describe('useSlots', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('garde loading=false pendant un refresh sur la meme timeline quand les slots sont deja charges', async () => {
    const initialFetch = createDeferred<{ data: unknown; error: unknown }>()
    const refreshFetch = createDeferred<{ data: unknown; error: unknown }>()
    const responses = [initialFetch.promise, refreshFetch.promise]

    fromMock.mockImplementation(() => createSlotsQueryBuilder(responses))

    const seenLoadingStates: boolean[] = []

    const { result } = renderHook(() => {
      const hook = useSlots('timeline-1')
      seenLoadingStates.push(hook.loading)
      return hook
    })

    expect(seenLoadingStates).toContain(true)

    await act(async () => {
      initialFetch.resolve({
        data: [
          {
            id: 'slot-1',
            timeline_id: 'timeline-1',
            kind: 'step',
            position: 0,
            card_id: null,
            tokens: 0,
          },
        ],
        error: null,
      })
      await initialFetch.promise
    })

    await waitFor(() => {
      expect(result.current.slots).toHaveLength(1)
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
        data: [
          {
            id: 'slot-1',
            timeline_id: 'timeline-1',
            kind: 'step',
            position: 0,
            card_id: 'card-1',
            tokens: 2,
          },
        ],
        error: null,
      })
      await refreshFetch.promise
    })

    await waitFor(() => {
      expect(result.current.slots[0]?.card_id).toBe('card-1')
      expect(result.current.slots[0]?.tokens).toBe(2)
      expect(result.current.loading).toBe(false)
    })

    expect(seenLoadingStates).not.toContain(true)
  })

  it('remet les jetons a 0 quand un slot step est vide via updateSlot', async () => {
    const selectResponses = [
      Promise.resolve({
        data: [
          {
            id: 'slot-1',
            timeline_id: 'timeline-1',
            kind: 'step',
            position: 0,
            card_id: 'card-1',
            tokens: 3,
          },
        ],
        error: null,
      }),
      Promise.resolve({
        data: [
          {
            id: 'slot-1',
            timeline_id: 'timeline-1',
            kind: 'step',
            position: 0,
            card_id: null,
            tokens: 0,
          },
        ],
        error: null,
      }),
    ]

    const selectBuilder = createSlotsQueryBuilder(selectResponses)
    const updateBuilder = createUpdateBuilder({ error: null })

    fromMock.mockImplementation(() => {
      const callIndex = fromMock.mock.calls.length

      if (callIndex === 1 || callIndex === 3) return selectBuilder
      if (callIndex === 2) return updateBuilder

      return createSlotsQueryBuilder([
        Promise.resolve({ data: [], error: null }),
      ])
    })

    const { result } = renderHook(() => useSlots('timeline-1'))

    await waitFor(() => {
      expect(result.current.slots[0]?.tokens).toBe(3)
    })

    await act(async () => {
      await result.current.updateSlot('slot-1', { card_id: null })
    })

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        card_id: null,
        tokens: 0,
        updated_at: expect.any(String),
      })
    )
  })

  it('retire toutes les cartes puis remet les jetons des steps a 0', async () => {
    const selectResponses = [
      Promise.resolve({ data: [], error: null }),
      Promise.resolve({ data: [], error: null }),
    ]

    const selectBuilder = createSlotsQueryBuilder(selectResponses)
    const clearCardsBuilder = createUpdateBuilder({ error: null })
    const resetStepTokensBuilder = createUpdateBuilder({ error: null })

    fromMock.mockImplementation(() => {
      const callIndex = fromMock.mock.calls.length

      if (callIndex === 1 || callIndex === 4) return selectBuilder
      if (callIndex === 2) return clearCardsBuilder
      if (callIndex === 3) return resetStepTokensBuilder

      return createSlotsQueryBuilder([
        Promise.resolve({ data: [], error: null }),
      ])
    })

    const { result } = renderHook(() => useSlots('timeline-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.clearAllCards()
    })

    expect(clearCardsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        card_id: null,
        updated_at: expect.any(String),
      })
    )
    expect(resetStepTokensBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: 0,
        updated_at: expect.any(String),
      })
    )
    expect(resetStepTokensBuilder.eq).toHaveBeenCalledWith('kind', 'step')
  })
})
