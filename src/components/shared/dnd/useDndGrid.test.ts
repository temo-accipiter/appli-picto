/**
 * Tests unitaires pour useDndGrid
 *
 * Vérifie :
 * - Swap items lors du drag & drop
 * - État activeId et swappedPair
 * - Retry logic (3 tentatives)
 * - Batch save (par 5 items)
 * - Callback onReorder optimistic
 * - Reset state
 */

import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useDndGrid } from './useDndGrid'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'

describe('useDndGrid', () => {
  // ═════════════════════════════════════════════════════════════════════════════
  // Helpers & Fixtures
  // ═════════════════════════════════════════════════════════════════════════════

  interface TestItem {
    id: string
    label: string
  }

  const createMockItems = (count: number): TestItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `item-${i + 1}`,
      label: `Label ${i + 1}`,
    }))
  }

  const createDragStartEvent = (activeId: string | number): DragStartEvent => ({
    active: {
      id: activeId,
      data: { current: {} },
      rect: { current: { initial: null, translated: null } },
    },
    activatorEvent: new MouseEvent('mousedown'),
  })

  const createDragEndEvent = (
    activeId: string | number,
    overId: string | number | null
  ): DragEndEvent => ({
    active: {
      id: activeId,
      data: { current: {} },
      rect: { current: { initial: null, translated: null } },
    },
    over: overId
      ? {
          id: overId,
          rect: {
            width: 100,
            height: 100,
            top: 0,
            left: 0,
            right: 100,
            bottom: 100,
          },
          data: { current: {} },
          disabled: false,
        }
      : null,
    delta: { x: 0, y: 0 },
    collisions: null,
    activatorEvent: new MouseEvent('mousedown'),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 1 : handleDragStart - Gestion début de drag
  // ═════════════════════════════════════════════════════════════════════════════

  it('définit activeId lors du handleDragStart', () => {
    const items = createMockItems(3)
    const onReorder = vi.fn()

    const { result } = renderHook(() =>
      useDndGrid({ items, onReorder, getItemId: item => item.id })
    )

    expect(result.current.activeId).toBeNull()
    expect(result.current.isDragging).toBe(false)

    act(() => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
    })

    expect(result.current.activeId).toBe('item-1')
    expect(result.current.isDragging).toBe(true)
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 2 : handleDragEnd - Swap items
  // ═════════════════════════════════════════════════════════════════════════════

  it('échange deux items lors du handleDragEnd', async () => {
    const items = createMockItems(3)
    const onReorder = vi.fn()

    const { result } = renderHook(() =>
      useDndGrid({ items, onReorder, getItemId: item => item.id })
    )

    // Start drag
    act(() => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
    })

    // End drag (swap item-1 with item-3)
    await act(async () => {
      await result.current.handleDragEnd(createDragEndEvent('item-1', 'item-3'))
    })

    // Vérifier que onReorder a été appelé avec la nouvelle liste swappée
    expect(onReorder).toHaveBeenCalledTimes(1)
    const newItems = onReorder.mock.calls?.[0]?.[0]
    expect(newItems).toBeDefined()
    expect(newItems[0].id).toBe('item-3') // item-3 prend la place de item-1
    expect(newItems[1].id).toBe('item-2') // item-2 reste en place
    expect(newItems[2].id).toBe('item-1') // item-1 prend la place de item-3
  })

  it('définit swappedPair après le swap pour animation', async () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    const { result } = renderHook(() =>
      useDndGrid({ items, onReorder, getItemId: item => item.id })
    )

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
      await result.current.handleDragEnd(createDragEndEvent('item-1', 'item-2'))
    })

    expect(result.current.swappedPair).toEqual(['item-1', 'item-2'])
    expect(result.current.activeId).toBeNull()
    expect(result.current.isDragging).toBe(false)
  })

  it("ne swap pas si l'item est droppé sur lui-même", async () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    const { result } = renderHook(() =>
      useDndGrid({ items, onReorder, getItemId: item => item.id })
    )

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
      await result.current.handleDragEnd(createDragEndEvent('item-1', 'item-1'))
    })

    expect(onReorder).not.toHaveBeenCalled()
    expect(result.current.swappedPair).toBeNull()
  })

  it('ne swap pas si pas de zone over (drop dans le vide)', async () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    const { result } = renderHook(() =>
      useDndGrid({ items, onReorder, getItemId: item => item.id })
    )

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
      await result.current.handleDragEnd(createDragEndEvent('item-1', null))
    })

    expect(onReorder).not.toHaveBeenCalled()
    expect(result.current.activeId).toBeNull()
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 3 : Batch save + Retry logic
  // ═════════════════════════════════════════════════════════════════════════════

  it('batch save par 5 items avec onReorderPosition', async () => {
    const items = createMockItems(12) // 12 items = 3 batches (5+5+2)
    const onReorder = vi.fn()
    const onReorderPosition = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useDndGrid({
        items,
        onReorder,
        onReorderPosition,
        getItemId: item => item.id,
      })
    )

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
      await result.current.handleDragEnd(createDragEndEvent('item-1', 'item-2'))
    })

    // Attendre les batches (Promise.all x3)
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // 12 items = 12 appels (batch 5 + batch 5 + batch 2)
    expect(onReorderPosition).toHaveBeenCalledTimes(12)

    // Vérifier les appels batch 1 (items 0-4)
    expect(onReorderPosition).toHaveBeenCalledWith('item-2', 0)
    expect(onReorderPosition).toHaveBeenCalledWith('item-1', 1)
  })

  it("retry 3x en cas d'erreur onReorderPosition", async () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()
    const onReorderPosition = vi
      .fn()
      .mockRejectedValue(new Error('Network error'))

    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { result } = renderHook(() =>
      useDndGrid({
        items,
        onReorder,
        onReorderPosition,
        getItemId: item => item.id,
      })
    )

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
      await result.current.handleDragEnd(createDragEndEvent('item-1', 'item-2'))
    })

    // Attendre tous les retries (1s + 2s + 3s = 6s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000)
    })

    // Vérifier que les retries ont eu lieu
    expect(consoleWarnSpy).toHaveBeenCalledTimes(3)
    expect(consoleWarnSpy).toHaveBeenCalledWith('Retry 1/3 saving positions')
    expect(consoleWarnSpy).toHaveBeenCalledWith('Retry 2/3 saving positions')
    expect(consoleWarnSpy).toHaveBeenCalledWith('Retry 3/3 saving positions')

    // Vérifier console.error après 3 retries
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save positions after 3 retries',
      expect.any(Error)
    )

    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it("reset swappedPair après 1s si pas d'onReorderPosition", async () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    const { result } = renderHook(() =>
      useDndGrid({ items, onReorder, getItemId: item => item.id })
    )

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
      await result.current.handleDragEnd(createDragEndEvent('item-1', 'item-2'))
    })

    expect(result.current.swappedPair).toEqual(['item-1', 'item-2'])

    // Avancer de 1s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(result.current.swappedPair).toBeNull()
  })

  it('reset swappedPair après 1s si onReorderPosition réussit', async () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()
    const onReorderPosition = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useDndGrid({
        items,
        onReorder,
        onReorderPosition,
        getItemId: item => item.id,
      })
    )

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
      await result.current.handleDragEnd(createDragEndEvent('item-1', 'item-2'))
    })

    expect(result.current.swappedPair).toEqual(['item-1', 'item-2'])

    // Attendre save + 1s delay
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(result.current.swappedPair).toBeNull()
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 4 : Reset state
  // ═════════════════════════════════════════════════════════════════════════════

  it('reset tous les états avec reset()', () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    const { result } = renderHook(() =>
      useDndGrid({ items, onReorder, getItemId: item => item.id })
    )

    act(() => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
    })

    expect(result.current.activeId).toBe('item-1')
    expect(result.current.isDragging).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.activeId).toBeNull()
    expect(result.current.swappedPair).toBeNull()
    expect(result.current.isDragging).toBe(false)
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 5 : getItemId et getItemIndex personnalisés
  // ═════════════════════════════════════════════════════════════════════════════

  it('utilise getItemId et getItemIndex personnalisés', async () => {
    interface CustomItem {
      uid: number
      name: string
    }

    const customItems: CustomItem[] = [
      { uid: 101, name: 'A' },
      { uid: 102, name: 'B' },
      { uid: 103, name: 'C' },
    ]

    const onReorder = vi.fn()

    const { result } = renderHook(() =>
      useDndGrid({
        items: customItems,
        onReorder,
        getItemId: item => item.uid,
        getItemIndex: (uid: string | number) => {
          const numUid = typeof uid === 'string' ? parseInt(uid, 10) : uid
          return customItems.findIndex(item => item.uid === numUid)
        },
      })
    )

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent('101'))
      await result.current.handleDragEnd(createDragEndEvent('101', '103'))
    })

    expect(onReorder).toHaveBeenCalledTimes(1)
    const newItems = onReorder.mock.calls?.[0]?.[0]
    expect(newItems).toBeDefined()
    expect(newItems[0].uid).toBe(103) // C prend la place de A
    expect(newItems[1].uid).toBe(102) // B reste en place
    expect(newItems[2].uid).toBe(101) // A prend la place de C
  })

  it('utilise getItemId par défaut (item.id) si non fourni', async () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    const { result } = renderHook(() => useDndGrid({ items, onReorder }))

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent('item-1'))
      await result.current.handleDragEnd(createDragEndEvent('item-1', 'item-2'))
    })

    expect(onReorder).toHaveBeenCalledTimes(1)
    const newItems = onReorder.mock.calls?.[0]?.[0]
    expect(newItems).toBeDefined()
    expect(newItems[0].id).toBe('item-2')
    expect(newItems[1].id).toBe('item-1')
  })
})
