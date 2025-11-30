'use client'

/**
 * DndGrid - Grille drag & drop complète et réutilisable
 *
 * Composant qui combine :
 * - DndContext (@dnd-kit) avec sensors (souris + clavier)
 * - useDndGrid hook pour logique DnD
 * - DndCard pour items draggables
 * - DndSlot pour zones droppables (mode édition)
 * - Grille responsive (mobile-first)
 *
 * Props :
 * - items : Array de T
 * - onReorder : Callback après reorder
 * - onReorderPosition : Callback async pour sauvegarder positions
 * - renderItem : Fonction de rendu pour items
 * - renderSlot : Fonction de rendu optionnelle pour slots
 * - isEditionMode : Si true, affiche les slots droppables
 * - slotsCount : Nombre de slots à afficher (édition mode)
 * - columns : Nombre de colonnes de la grille
 * - gap : Espacement entre items
 * - layout : Preset layout (taches, recompenses, custom)
 * - children : Contenu optionnel
 * - className : Classes CSS additionnelles
 */

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { AnimatePresence } from 'framer-motion'
import { ReactNode, useMemo } from 'react'
import DndCard from '../DndCard/DndCard'
import DndSlot from '../DndSlot/DndSlot'
import { useDndGrid } from '../useDndGrid'
import './DndGrid.scss'

export interface DndGridProps<T> {
  items: T[]
  onReorder: (newItems: T[]) => void
  onReorderPosition?: (itemId: string | number, newPos: number) => Promise<void>
  renderItem: (item: T, index: number) => ReactNode
  renderSlot?: (slotId: string | number, index: number) => ReactNode
  isEditionMode?: boolean
  slotsCount?: number
  columns?: 'auto' | 2 | 3 | 4
  gap?: 'small' | 'medium' | 'large'
  layout?: 'taches' | 'recompenses' | 'custom'
  getItemId?: (item: T) => string | number
  getItemIndex?: (itemId: string | number) => number
  children?: ReactNode
  className?: string
}

function DndGrid<T>({
  items,
  onReorder,
  onReorderPosition,
  renderItem,
  renderSlot,
  isEditionMode = false,
  slotsCount = 3,
  columns = 'auto',
  gap = 'medium',
  layout = 'custom',
  getItemId = (item: T) => (item as { id: string | number }).id,
  getItemIndex = (id: string | number) =>
    items.findIndex(item => getItemId(item) === id),
  children,
  className = '',
}: DndGridProps<T>) {
  // Setup sensors pour clavier + souris (WCAG 2.1.1)
  const sensors = useSensors(
    useSensor(PointerSensor, {}),
    useSensor(KeyboardSensor)
  )

  // Utiliser le hook DnD
  const { swappedPair, isDragging, handleDragStart, handleDragEnd } =
    useDndGrid({
      items,
      onReorder,
      onReorderPosition,
      getItemId,
      getItemIndex,
    } as Parameters<typeof useDndGrid>[0])

  // Générer les slots vides pour édition mode
  const slots = useMemo(() => {
    if (!isEditionMode) return []
    return Array.from({ length: slotsCount }, (_, i) => ({
      id: `slot-${i}`,
      index: i,
    }))
  }, [isEditionMode, slotsCount])

  // Classes pour la grille
  const gridClasses = [
    'dnd-grid',
    `dnd-grid--${columns}`,
    `dnd-grid--gap-${gap}`,
    `dnd-grid--${layout}`,
    isDragging && 'dnd-grid--dragging',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart as (event: DragStartEvent) => void}
      onDragEnd={handleDragEnd as (event: DragEndEvent) => void}
    >
      <div className={gridClasses} role="main" aria-live="polite">
        {/* Items draggables avec AnimatePresence pour les entrées/sorties */}
        <AnimatePresence>
          {items.map((item, index) => (
            <DndCard
              key={getItemId(item)}
              id={getItemId(item)}
              isDraggingGlobal={isDragging}
              isBeingSwapped={
                !!(
                  swappedPair &&
                  (swappedPair[0] === getItemId(item) ||
                    swappedPair[1] === getItemId(item))
                )
              }
              testId={`dnd-item-${index}`}
            >
              {renderItem(item, index)}
            </DndCard>
          ))}
        </AnimatePresence>

        {/* Slots droppables (si édition mode) */}
        {isEditionMode && (
          <AnimatePresence>
            {slots.map(slot => (
              <DndSlot key={slot.id} id={slot.id} isDraggingFrom={false}>
                {renderSlot ? (
                  renderSlot(slot.id, slot.index)
                ) : (
                  <div style={{ minHeight: '140px' }} />
                )}
              </DndSlot>
            ))}
          </AnimatePresence>
        )}

        {/* Contenu optionnel */}
        {children}
      </div>
    </DndContext>
  )
}

export default DndGrid
