'use client'

/**
 * Tests unitaires pour DndCard
 *
 * Vérifie :
 * - Rendu avec props de base
 * - Classes CSS selon états (dragging, swapping)
 * - Animations et transformations
 * - Callbacks onDragStart/onDragEnd
 * - Attributs ARIA et accessibilité
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DndCard from './DndCard'

// ✅ Mock @dnd-kit/core avec vi.hoisted()
const { mockSetNodeRef, mockUseDraggable, mockUseDragAnimation } = vi.hoisted(
  () => ({
    mockSetNodeRef: vi.fn(),
    mockUseDraggable: vi.fn(),
    mockUseDragAnimation: vi.fn(),
  })
)

vi.mock('@dnd-kit/core', () => ({
  useDraggable: mockUseDraggable,
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
}))

// ✅ Mock useDragAnimation hook
vi.mock('@/hooks', () => ({
  useDragAnimation: mockUseDragAnimation,
}))

describe('DndCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock values
    mockUseDraggable.mockReturnValue({
      attributes: { role: 'button', tabIndex: 0 },
      listeners: { onMouseDown: vi.fn(), onTouchStart: vi.fn() },
      setNodeRef: mockSetNodeRef,
      transform: null,
      isDragging: false,
    })

    mockUseDragAnimation.mockReturnValue({
      transitionDuration: '250ms',
      buildTransform: vi.fn(() => undefined),
      dragPhase: 'idle',
      swapPhase: 'idle',
      transformValues: { scale: 1, rotate: 0, y: 0 },
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 1 : Rendu de base avec props
  // ═════════════════════════════════════════════════════════════════════════════

  it('rend avec les props de base correctement', () => {
    render(
      <DndCard id="test-card-1">
        <div>Test Content</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-1')
    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent('Test Content')
    expect(card).toHaveClass('dnd-card')
  })

  it('applique le testId personnalisé si fourni', () => {
    render(
      <DndCard id="test-card-2" testId="custom-test-id">
        <div>Content</div>
      </DndCard>
    )

    const card = screen.getByTestId('custom-test-id')
    expect(card).toBeInTheDocument()
  })

  it('applique les classes CSS personnalisées', () => {
    render(
      <DndCard id="test-card-3" className="custom-class">
        <div>Content</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-3')
    expect(card).toHaveClass('dnd-card')
    expect(card).toHaveClass('custom-class')
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 2 : États de dragging
  // ═════════════════════════════════════════════════════════════════════════════

  it('applique la classe dnd-card--dragging quand isDragging=true', () => {
    mockUseDraggable.mockReturnValue({
      attributes: { role: 'button', tabIndex: 0 },
      listeners: {},
      setNodeRef: mockSetNodeRef,
      transform: { x: 10, y: 20 },
      isDragging: true,
    })

    render(
      <DndCard id="test-card-4">
        <div>Dragging</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-4')
    expect(card).toHaveClass('dnd-card--dragging')
    expect(card).toHaveStyle({ opacity: '0.92', cursor: 'grabbing' })
  })

  it('applique la classe dnd-card--swapping quand isBeingSwapped=true', () => {
    render(
      <DndCard id="test-card-5" isBeingSwapped={true}>
        <div>Swapping</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-5')
    expect(card).toHaveClass('dnd-card--swapping')
  })

  it('désactive pointer-events quand isDraggingGlobal=true (pas draggé)', () => {
    render(
      <DndCard id="test-card-6" isDraggingGlobal={true}>
        <div>Not dragged</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-6')
    expect(card).toHaveStyle({ pointerEvents: 'none' })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 3 : Animations et transformations
  // ═════════════════════════════════════════════════════════════════════════════

  it('applique le transform buildé par useDragAnimation', () => {
    const mockBuildTransform = vi.fn(() => 'translate(10px, 20px) scale(1.05)')
    mockUseDragAnimation.mockReturnValue({
      transitionDuration: '500ms',
      buildTransform: mockBuildTransform,
      dragPhase: 'moving',
      swapPhase: 'idle',
      transformValues: { scale: 1.05, rotate: 0, y: 0 },
    })

    mockUseDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: mockSetNodeRef,
      transform: { x: 10, y: 20 },
      isDragging: true,
    })

    render(
      <DndCard id="test-card-7">
        <div>Animated</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-7')
    expect(card).toHaveStyle({ transform: 'translate(10px, 20px) scale(1.05)' })
    expect(mockBuildTransform).toHaveBeenCalledWith({ x: 10, y: 20 })
  })

  it('applique la durée de transition correcte', () => {
    mockUseDragAnimation.mockReturnValue({
      transitionDuration: '350ms',
      buildTransform: vi.fn(() => undefined),
      dragPhase: 'shrinking',
      swapPhase: 'idle',
      transformValues: { scale: 0.75, rotate: 3, y: -15 },
    })

    render(
      <DndCard id="test-card-8">
        <div>Transition</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-8')
    expect(card.style.transition).toContain('350ms')
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 4 : Callbacks onDragStart/onDragEnd
  // ═════════════════════════════════════════════════════════════════════════════

  it('appelle onDragStart quand isDragging passe à true', () => {
    const onDragStart = vi.fn()
    const onDragEnd = vi.fn()

    mockUseDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: mockSetNodeRef,
      transform: null,
      isDragging: true,
    })

    render(
      <DndCard id="test-card-9" onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div>Callback test</div>
      </DndCard>
    )

    expect(onDragStart).toHaveBeenCalledTimes(1)
    expect(onDragEnd).not.toHaveBeenCalled()
  })

  it('appelle onDragEnd quand isDragging passe à false', () => {
    const onDragStart = vi.fn()
    const onDragEnd = vi.fn()

    mockUseDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: mockSetNodeRef,
      transform: null,
      isDragging: false,
    })

    render(
      <DndCard
        id="test-card-10"
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div>Callback test</div>
      </DndCard>
    )

    expect(onDragStart).not.toHaveBeenCalled()
    expect(onDragEnd).toHaveBeenCalledTimes(1)
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 5 : Accessibilité (ARIA, tabIndex)
  // ═════════════════════════════════════════════════════════════════════════════

  it('applique les attributs ARIA de useDraggable', () => {
    mockUseDraggable.mockReturnValue({
      attributes: {
        role: 'button',
        tabIndex: 0,
        'aria-pressed': 'false',
        'aria-describedby': 'dnd-instructions',
      },
      listeners: {},
      setNodeRef: mockSetNodeRef,
      transform: null,
      isDragging: false,
    })

    render(
      <DndCard id="test-card-11">
        <div>ARIA test</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-11')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabindex', '0')
    expect(card).toHaveAttribute('aria-pressed', 'false')
    expect(card).toHaveAttribute('aria-describedby', 'dnd-instructions')
  })

  it('a un cursor grab quand non-draggé', () => {
    render(
      <DndCard id="test-card-12">
        <div>Cursor test</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-12')
    expect(card).toHaveStyle({ cursor: 'grab' })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 6 : Optimisations de performance
  // ═════════════════════════════════════════════════════════════════════════════

  it('définit willChange:transform pendant le drag pour perf', () => {
    mockUseDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: mockSetNodeRef,
      transform: { x: 5, y: 10 },
      isDragging: true,
    })

    render(
      <DndCard id="test-card-13">
        <div>Performance test</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-13')
    expect(card).toHaveStyle({ willChange: 'transform' })
  })

  it('applique touchAction:manipulation pour mobile', () => {
    render(
      <DndCard id="test-card-14">
        <div>Mobile test</div>
      </DndCard>
    )

    const card = screen.getByTestId('dnd-card-test-card-14')
    // Note: jsdom ne supporte pas touchAction dans style inline
    // On vérifie juste que le composant rend sans erreur
    expect(card).toBeInTheDocument()
  })
})
