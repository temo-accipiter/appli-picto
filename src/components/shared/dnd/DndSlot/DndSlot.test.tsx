'use client'

/**
 * Tests unitaires pour DndSlot
 *
 * Vérifie :
 * - Rendu avec props de base
 * - Classes CSS selon états (over, draggingFrom)
 * - Attributs ARIA et accessibilité
 * - minHeight personnalisable
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DndSlot from './DndSlot'

// ✅ Mock @dnd-kit/core avec vi.hoisted()
const { mockSetNodeRef, mockUseDroppable } = vi.hoisted(() => ({
  mockSetNodeRef: vi.fn(),
  mockUseDroppable: vi.fn(),
}))

vi.mock('@dnd-kit/core', () => ({
  useDroppable: mockUseDroppable,
}))

describe('DndSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock values
    mockUseDroppable.mockReturnValue({
      setNodeRef: mockSetNodeRef,
      isOver: false,
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 1 : Rendu de base avec props
  // ═════════════════════════════════════════════════════════════════════════════

  it('rend avec les props de base correctement', () => {
    render(<DndSlot id="slot-1" />)

    const slot = screen.getByTestId('dnd-slot-slot-1')
    expect(slot).toBeInTheDocument()
    expect(slot).toHaveClass('dnd-slot')
  })

  it('applique le minHeight par défaut de 140px', () => {
    render(<DndSlot id="slot-2" />)

    const slot = screen.getByTestId('dnd-slot-slot-2')
    expect(slot).toHaveStyle({ minHeight: '140px' })
  })

  it('applique le minHeight personnalisé si fourni', () => {
    render(<DndSlot id="slot-3" minHeight="200px" />)

    const slot = screen.getByTestId('dnd-slot-slot-3')
    expect(slot).toHaveStyle({ minHeight: '200px' })
  })

  it('rend les enfants (children) correctement', () => {
    render(
      <DndSlot id="slot-4">
        <div>Test Child Content</div>
      </DndSlot>
    )

    const slot = screen.getByTestId('dnd-slot-slot-4')
    expect(slot).toHaveTextContent('Test Child Content')
  })

  it('applique les classes CSS personnalisées', () => {
    render(<DndSlot id="slot-5" className="custom-slot-class" />)

    const slot = screen.getByTestId('dnd-slot-slot-5')
    expect(slot).toHaveClass('dnd-slot')
    expect(slot).toHaveClass('custom-slot-class')
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 2 : États visuels (over, draggingFrom)
  // ═════════════════════════════════════════════════════════════════════════════

  it('applique la classe dnd-slot--over quand isOver=true', () => {
    mockUseDroppable.mockReturnValue({
      setNodeRef: mockSetNodeRef,
      isOver: true,
    })

    render(<DndSlot id="slot-6" />)

    const slot = screen.getByTestId('dnd-slot-slot-6')
    expect(slot).toHaveClass('dnd-slot--over')
  })

  it("n'applique pas la classe over quand isOver=false", () => {
    mockUseDroppable.mockReturnValue({
      setNodeRef: mockSetNodeRef,
      isOver: false,
    })

    render(<DndSlot id="slot-7" />)

    const slot = screen.getByTestId('dnd-slot-slot-7')
    expect(slot).not.toHaveClass('dnd-slot--over')
  })

  it('applique la classe dnd-slot--dragging-from quand isDraggingFrom=true', () => {
    render(<DndSlot id="slot-8" isDraggingFrom={true} />)

    const slot = screen.getByTestId('dnd-slot-slot-8')
    expect(slot).toHaveClass('dnd-slot--dragging-from')
  })

  it("n'applique pas la classe dragging-from quand isDraggingFrom=false", () => {
    render(<DndSlot id="slot-9" isDraggingFrom={false} />)

    const slot = screen.getByTestId('dnd-slot-slot-9')
    expect(slot).not.toHaveClass('dnd-slot--dragging-from')
  })

  it('combine les classes over + draggingFrom si les deux sont true', () => {
    mockUseDroppable.mockReturnValue({
      setNodeRef: mockSetNodeRef,
      isOver: true,
    })

    render(<DndSlot id="slot-10" isDraggingFrom={true} />)

    const slot = screen.getByTestId('dnd-slot-slot-10')
    expect(slot).toHaveClass('dnd-slot--over')
    expect(slot).toHaveClass('dnd-slot--dragging-from')
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 3 : Accessibilité (ARIA, role)
  // ═════════════════════════════════════════════════════════════════════════════

  it('a le role="region" pour accessibilité', () => {
    render(<DndSlot id="slot-11" />)

    const slot = screen.getByTestId('dnd-slot-slot-11')
    expect(slot).toHaveAttribute('role', 'region')
  })

  it('a un aria-label par défaut avec ID', () => {
    render(<DndSlot id="slot-12" />)

    const slot = screen.getByTestId('dnd-slot-slot-12')
    expect(slot).toHaveAttribute('aria-label', 'Zone de dépôt slot-12')
  })

  it('applique le label personnalisé dans aria-label', () => {
    render(<DndSlot id="slot-13" label="Zone personnalisée" />)

    const slot = screen.getByTestId('dnd-slot-slot-13')
    expect(slot).toHaveAttribute('aria-label', 'Zone personnalisée slot-13')
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 4 : Intégration avec @dnd-kit/core
  // ═════════════════════════════════════════════════════════════════════════════

  it('appelle useDroppable avec le bon id', () => {
    render(<DndSlot id="slot-14" />)

    expect(mockUseDroppable).toHaveBeenCalledWith({ id: 'slot-14' })
  })

  it('convertit les IDs numériques en string pour @dnd-kit', () => {
    render(<DndSlot id={123} />)

    expect(mockUseDroppable).toHaveBeenCalledWith({ id: '123' })
  })

  it('attache setNodeRef au div pour @dnd-kit', () => {
    const customSetNodeRef = vi.fn()
    mockUseDroppable.mockReturnValue({
      setNodeRef: customSetNodeRef,
      isOver: false,
    })

    render(<DndSlot id="slot-15" />)

    // Le ref devrait être appelé avec le nœud DOM
    expect(customSetNodeRef).toHaveBeenCalled()
  })
})
