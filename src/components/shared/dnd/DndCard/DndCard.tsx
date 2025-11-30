'use client'

/**
 * DndCard - Composant draggable réutilisable
 *
 * Wrapper autour de useDraggable (@dnd-kit) qui gère :
 * - Les phases d'animation (5 phases : lifting, shrinking, growing, moving, idle)
 * - Le style inline pour le drag fluide
 * - Les attributs et listeners pour drag & drop
 *
 * À utiliser pour tout élément draggable dans une grille DnD.
 */

import { memo, ReactNode, CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useDragAnimation } from '@/hooks'
import './DndCard.scss'

export interface DndCardProps {
  id: string | number
  isDraggingGlobal?: boolean
  isBeingSwapped?: boolean
  children: ReactNode
  className?: string
  onDragStart?: () => void
  onDragEnd?: () => void
  testId?: string
}

const DndCard = memo(function DndCard({
  id,
  isDraggingGlobal = false,
  isBeingSwapped = false,
  children,
  className = '',
  onDragStart,
  onDragEnd,
  testId,
}: DndCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: String(id),
    })

  // Utiliser le hook pour gérer les animations
  const { transitionDuration, buildTransform } = useDragAnimation(
    isDragging,
    isBeingSwapped
  )

  // Callback hooks (si fournis)
  if (isDragging && onDragStart) onDragStart()
  if (!isDragging && onDragEnd) onDragEnd()

  // Style pour le drag avec animation fluide
  const style: CSSProperties = {
    transform: buildTransform(transform),
    transition: `transform ${transitionDuration} cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow ${transitionDuration} ease-out, opacity 150ms ease`,
    touchAction: 'manipulation',
    // Désactiver les pointer events sur les cartes non-draggées pendant un drag global
    pointerEvents:
      isDraggingGlobal && !isDragging ? ('none' as const) : ('auto' as const),
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.92 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    boxShadow: isDragging
      ? '0 20px 40px rgba(0, 0, 0, 0.3), 0 10px 15px rgba(0, 0, 0, 0.2)'
      : undefined,
    willChange: isDragging ? 'transform' : undefined,
  }

  const classNames = [
    'dnd-card',
    isDragging && 'dnd-card--dragging',
    isBeingSwapped && 'dnd-card--swapping',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={setNodeRef}
      className={classNames}
      style={style}
      data-testid={testId || `dnd-card-${id}`}
      {...attributes}
    >
      <div className="dnd-card__drag-handle" {...listeners}>
        {/* Zone de drag invisible qui couvre toute la card */}
      </div>
      {children}
    </div>
  )
})

DndCard.displayName = 'DndCard'

export default DndCard
