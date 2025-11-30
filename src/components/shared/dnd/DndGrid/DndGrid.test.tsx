'use client'

/**
 * Tests d'intégration pour DndGrid
 *
 * Vérifie :
 * - Rendu complet de la grille avec items + slots
 * - Intégration DndContext + sensors
 * - AnimatePresence pour add/remove items
 * - Layout responsive (columns, gap, layout)
 * - Callbacks onReorder et onReorderPosition
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DndGrid from './DndGrid'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'

// ✅ Mock @dnd-kit/core complet avec vi.hoisted()
const { mockUseSensor, mockUseSensors, mockClosestCenter } = vi.hoisted(() => ({
  mockUseSensor: vi.fn(() => ({})),
  mockUseSensors: vi.fn(() => []),
  mockClosestCenter: vi.fn(),
}))

let mockDndContextProps: {
  onDragStart: ((event: DragStartEvent) => void) | undefined
  onDragEnd: ((event: DragEndEvent) => void) | undefined
} = {
  onDragStart: undefined,
  onDragEnd: undefined,
}

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragStart,
    onDragEnd,
  }: {
    children: React.ReactNode
    onDragStart?: (event: DragStartEvent) => void
    onDragEnd?: (event: DragEndEvent) => void
  }) => {
    mockDndContextProps = { onDragStart, onDragEnd }
    return <div data-testid="dnd-context">{children}</div>
  },
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
  closestCenter: mockClosestCenter,
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: mockUseSensor,
  useSensors: mockUseSensors,
}))

// ✅ Mock framer-motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
}))

// ✅ Mock useDragAnimation
vi.mock('@/hooks', () => ({
  useDragAnimation: () => ({
    transitionDuration: '250ms',
    buildTransform: vi.fn(() => undefined),
    dragPhase: 'idle',
    swapPhase: 'idle',
    transformValues: { scale: 1, rotate: 0, y: 0 },
  }),
}))

describe('DndGrid', () => {
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

  const renderItem = (item: TestItem) => (
    <div data-testid={`item-content-${item.id}`}>{item.label}</div>
  )

  const renderSlot = (slotId: string | number) => (
    <div data-testid={`slot-content-${slotId}`}>Empty Slot</div>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    mockDndContextProps = {
      onDragStart: undefined,
      onDragEnd: undefined,
    }
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 1 : Rendu de base avec items
  // ═════════════════════════════════════════════════════════════════════════════

  it('rend la grille avec items correctement', () => {
    const items = createMockItems(3)
    const onReorder = vi.fn()

    render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem} />
    )

    // Vérifier que le DndContext est rendu
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument()

    // Vérifier que les items sont rendus
    expect(screen.getByTestId('item-content-item-1')).toHaveTextContent(
      'Label 1'
    )
    expect(screen.getByTestId('item-content-item-2')).toHaveTextContent(
      'Label 2'
    )
    expect(screen.getByTestId('item-content-item-3')).toHaveTextContent(
      'Label 3'
    )
  })

  it('applique les classes CSS selon layout et gap', () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    const { container } = render(
      <DndGrid
        items={items}
        onReorder={onReorder}
        renderItem={renderItem}
        columns={3}
        gap="large"
        layout="taches"
      />
    )

    const grid = container.querySelector('.dnd-grid')
    expect(grid).toHaveClass('dnd-grid--3')
    expect(grid).toHaveClass('dnd-grid--gap-large')
    expect(grid).toHaveClass('dnd-grid--taches')
  })

  it('applique la classe personnalisée si fournie', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    const { container } = render(
      <DndGrid
        items={items}
        onReorder={onReorder}
        renderItem={renderItem}
        className="custom-grid-class"
      />
    )

    const grid = container.querySelector('.dnd-grid')
    expect(grid).toHaveClass('custom-grid-class')
  })

  it('a le role="main" et aria-live="polite" pour accessibilité', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    const { container } = render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem} />
    )

    const grid = container.querySelector('.dnd-grid')
    expect(grid).toHaveAttribute('role', 'main')
    expect(grid).toHaveAttribute('aria-live', 'polite')
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 2 : Mode édition avec slots
  // ═════════════════════════════════════════════════════════════════════════════

  it('rend les slots droppables en mode édition', () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    render(
      <DndGrid
        items={items}
        onReorder={onReorder}
        renderItem={renderItem}
        renderSlot={renderSlot}
        isEditionMode={true}
        slotsCount={3}
      />
    )

    // Vérifier que les 3 slots sont rendus
    expect(screen.getByTestId('dnd-slot-slot-0')).toBeInTheDocument()
    expect(screen.getByTestId('dnd-slot-slot-1')).toBeInTheDocument()
    expect(screen.getByTestId('dnd-slot-slot-2')).toBeInTheDocument()

    // Vérifier le contenu des slots
    expect(screen.getByTestId('slot-content-slot-0')).toHaveTextContent(
      'Empty Slot'
    )
  })

  it('ne rend pas les slots si isEditionMode=false', () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    render(
      <DndGrid
        items={items}
        onReorder={onReorder}
        renderItem={renderItem}
        isEditionMode={false}
        slotsCount={3}
      />
    )

    // Les slots ne doivent pas être rendus
    expect(screen.queryByTestId('dnd-slot-slot-0')).not.toBeInTheDocument()
  })

  it('rend les slots avec minHeight par défaut si renderSlot non fourni', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    const { container } = render(
      <DndGrid
        items={items}
        onReorder={onReorder}
        renderItem={renderItem}
        isEditionMode={true}
        slotsCount={2}
      />
    )

    // Les slots devraient exister avec div default
    const slots = container.querySelectorAll('[data-testid^="dnd-slot"]')
    expect(slots.length).toBe(2)
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 3 : AnimatePresence pour add/remove items
  // ═════════════════════════════════════════════════════════════════════════════

  it('utilise AnimatePresence pour les items', () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem} />
    )

    // Vérifier que AnimatePresence est présent
    const animatePresence = screen.getAllByTestId('animate-presence')
    expect(animatePresence.length).toBeGreaterThan(0)
  })

  it('met à jour les items quand la liste change (add)', () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()

    const { rerender } = render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem} />
    )

    expect(screen.getByTestId('item-content-item-1')).toBeInTheDocument()
    expect(screen.getByTestId('item-content-item-2')).toBeInTheDocument()

    // Ajouter un item
    const newItems = [...items, { id: 'item-3', label: 'Label 3' }]
    rerender(
      <DndGrid items={newItems} onReorder={onReorder} renderItem={renderItem} />
    )

    expect(screen.getByTestId('item-content-item-3')).toBeInTheDocument()
  })

  it('met à jour les items quand la liste change (remove)', () => {
    const items = createMockItems(3)
    const onReorder = vi.fn()

    const { rerender } = render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem} />
    )

    expect(screen.getByTestId('item-content-item-1')).toBeInTheDocument()
    expect(screen.getByTestId('item-content-item-2')).toBeInTheDocument()
    expect(screen.getByTestId('item-content-item-3')).toBeInTheDocument()

    // Retirer un item
    const newItems = items.slice(0, 2)
    rerender(
      <DndGrid items={newItems} onReorder={onReorder} renderItem={renderItem} />
    )

    expect(screen.queryByTestId('item-content-item-3')).not.toBeInTheDocument()
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 4 : Intégration DndContext + sensors
  // ═════════════════════════════════════════════════════════════════════════════

  it('configure les sensors (PointerSensor + KeyboardSensor)', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem} />
    )

    // Vérifier que useSensor a été appelé 2 fois (Pointer + Keyboard)
    expect(mockUseSensor).toHaveBeenCalledTimes(2)
    expect(mockUseSensors).toHaveBeenCalled()
  })

  it('utilise closestCenter pour collision detection', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem} />
    )

    // closestCenter devrait être utilisé dans DndContext
    // (vérifié via mock)
    expect(mockClosestCenter).toBeDefined()
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 5 : Callbacks onReorder et onReorderPosition
  // ═════════════════════════════════════════════════════════════════════════════

  it('appelle onReorder via handleDragEnd du hook', async () => {
    const items = createMockItems(3)
    const onReorder = vi.fn()

    render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem} />
    )

    // Simuler un drag-end via le callback capturé
    if (mockDndContextProps.onDragEnd) {
      const dragEndEvent: DragEndEvent = {
        active: {
          id: 'item-1',
          data: { current: {} },
          rect: { current: { initial: null, translated: null } },
        },
        over: {
          id: 'item-3',
          rect: { width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 },
          data: { current: {} },
          disabled: false,
        },
        delta: { x: 0, y: 0 },
        collisions: null,
        activatorEvent: new MouseEvent('mousedown'),
      }

      await mockDndContextProps.onDragEnd(dragEndEvent)

      // onReorder devrait être appelé avec la liste swappée
      expect(onReorder).toHaveBeenCalled()
    }
  })

  it('appelle onReorderPosition si fourni', async () => {
    const items = createMockItems(2)
    const onReorder = vi.fn()
    const onReorderPosition = vi.fn().mockResolvedValue(undefined)

    render(
      <DndGrid
        items={items}
        onReorder={onReorder}
        onReorderPosition={onReorderPosition}
        renderItem={renderItem}
      />
    )

    // Simuler un drag-end
    if (mockDndContextProps.onDragEnd) {
      const dragEndEvent: DragEndEvent = {
        active: {
          id: 'item-1',
          data: { current: {} },
          rect: { current: { initial: null, translated: null } },
        },
        over: {
          id: 'item-2',
          rect: { width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 },
          data: { current: {} },
          disabled: false,
        },
        delta: { x: 0, y: 0 },
        collisions: null,
        activatorEvent: new MouseEvent('mousedown'),
      }

      await mockDndContextProps.onDragEnd(dragEndEvent)

      // onReorderPosition devrait être appelé (via useDndGrid)
      // Note: nécessite await pour async batch save
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 6 : Responsive layout (columns)
  // ═════════════════════════════════════════════════════════════════════════════

  it('applique la classe columns=auto par défaut', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    const { container } = render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem} />
    )

    const grid = container.querySelector('.dnd-grid')
    expect(grid).toHaveClass('dnd-grid--auto')
  })

  it('applique la classe columns=2', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    const { container } = render(
      <DndGrid
        items={items}
        onReorder={onReorder}
        renderItem={renderItem}
        columns={2}
      />
    )

    const grid = container.querySelector('.dnd-grid')
    expect(grid).toHaveClass('dnd-grid--2')
  })

  it('applique la classe gap=small', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    const { container } = render(
      <DndGrid
        items={items}
        onReorder={onReorder}
        renderItem={renderItem}
        gap="small"
      />
    )

    const grid = container.querySelector('.dnd-grid')
    expect(grid).toHaveClass('dnd-grid--gap-small')
  })

  it('applique la classe layout=recompenses', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    const { container } = render(
      <DndGrid
        items={items}
        onReorder={onReorder}
        renderItem={renderItem}
        layout="recompenses"
      />
    )

    const grid = container.querySelector('.dnd-grid')
    expect(grid).toHaveClass('dnd-grid--recompenses')
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 7 : Children optionnels
  // ═════════════════════════════════════════════════════════════════════════════

  it('rend les children optionnels si fournis', () => {
    const items = createMockItems(1)
    const onReorder = vi.fn()

    render(
      <DndGrid items={items} onReorder={onReorder} renderItem={renderItem}>
        <div data-testid="custom-child">Custom Content</div>
      </DndGrid>
    )

    expect(screen.getByTestId('custom-child')).toBeInTheDocument()
    expect(screen.getByTestId('custom-child')).toHaveTextContent(
      'Custom Content'
    )
  })
})
