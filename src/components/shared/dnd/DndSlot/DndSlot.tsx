'use client'

/**
 * DndSlot - Zone droppable réutilisable
 *
 * Wrapper autour de useDroppable (@dnd-kit) qui gère :
 * - La zone de drop pour recevoir des éléments draggés
 * - Les états visuels (over, dragging-from)
 * - L'accessibilité (role="region", aria-label)
 *
 * À utiliser pour les slots vides dans une grille DnD (mode édition)
 */

import { memo, ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import './DndSlot.scss'

export interface DndSlotProps {
  id: string | number
  isDraggingFrom?: boolean
  minHeight?: string
  children?: ReactNode
  className?: string
  label?: string
}

const DndSlot = memo(function DndSlot({
  id,
  isDraggingFrom = false,
  minHeight = '140px',
  children,
  className = '',
  label = 'Zone de dépôt',
}: DndSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: String(id) })

  const classNames = [
    'dnd-slot',
    isOver && 'dnd-slot--over',
    isDraggingFrom && 'dnd-slot--dragging-from',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={setNodeRef}
      className={classNames}
      style={{ minHeight }}
      role="region"
      aria-label={`${label} ${id}`}
      data-testid={`dnd-slot-${id}`}
    >
      {children}
    </div>
  )
})

DndSlot.displayName = 'DndSlot'

export default DndSlot
