'use client'

import { useEffect, useState } from 'react'

/**
 * Hook pour gérer les animations de drag & drop en 5 phases
 * Utilisé par TableauCard et futur DndCard
 */

export type DragPhase = 'idle' | 'lifting' | 'shrinking' | 'growing' | 'moving'
export type SwapPhase = 'idle' | 'shrinking' | 'growing'

export interface TransformValues {
  scale: number
  rotate: number
  y: number
}

export interface UseDragAnimationReturn {
  dragPhase: DragPhase
  swapPhase: SwapPhase
  transformValues: TransformValues
  transitionDuration: string
  buildTransform: (
    dndTransform?: { x: number; y: number } | null
  ) => string | undefined
}

/**
 * Hook pour gérer les phases d'animation du drag
 * @param isDragging - Si l'élément est actuellement draggé
 * @param isBeingSwapped - Si l'élément est en train d'être swappé
 * @returns Objet contenant les phases et les styles
 */
export function useDragAnimation(
  isDragging: boolean,
  isBeingSwapped: boolean = false
): UseDragAnimationReturn {
  const [dragPhase, setDragPhase] = useState<DragPhase>('idle')
  const [swapPhase, setSwapPhase] = useState<SwapPhase>('idle')

  // Gérer les phases d'animation du drag
  useEffect(() => {
    if (isDragging) {
      setDragPhase('lifting')
      const shrinkTimer = setTimeout(() => setDragPhase('shrinking'), 120)
      const growTimer = setTimeout(() => setDragPhase('growing'), 500)
      const moveTimer = setTimeout(() => setDragPhase('moving'), 900)
      return () => {
        clearTimeout(shrinkTimer)
        clearTimeout(growTimer)
        clearTimeout(moveTimer)
      }
    } else {
      setDragPhase('idle')
    }
  }, [isDragging])

  // Gérer l'animation de swap
  useEffect(() => {
    if (isBeingSwapped) {
      setSwapPhase('shrinking')
      const growTimer = setTimeout(() => setSwapPhase('growing'), 800)
      return () => clearTimeout(growTimer)
    } else {
      setSwapPhase('idle')
    }
  }, [isBeingSwapped])

  // Calculer les valeurs de transformation selon la phase
  const getTransformValues = (): TransformValues => {
    if (!isDragging && swapPhase !== 'idle') {
      switch (swapPhase) {
        case 'shrinking':
          return { scale: 0.6, rotate: -5, y: -30 }
        case 'growing':
          return { scale: 1, rotate: 0, y: 0 }
        default:
          return { scale: 1, rotate: 0, y: 0 }
      }
    }
    switch (dragPhase) {
      case 'lifting':
        return { scale: 1.05, rotate: -2, y: -8 }
      case 'shrinking':
        return { scale: 0.75, rotate: 3, y: -15 }
      case 'growing':
        return { scale: 0.9, rotate: -1, y: -10 }
      case 'moving':
        return { scale: 1.03, rotate: 0, y: 0 }
      default:
        return { scale: 1, rotate: 0, y: 0 }
    }
  }

  const transformValues = getTransformValues()

  // Durée de transition selon la phase
  const getTransitionDuration = (): string => {
    if (!isDragging && swapPhase !== 'idle') {
      return swapPhase === 'shrinking' ? '700ms' : '900ms'
    }
    switch (dragPhase) {
      case 'lifting':
        return '120ms'
      case 'shrinking':
        return '350ms'
      case 'growing':
        return '400ms'
      case 'moving':
        return '500ms'
      default:
        return '250ms'
    }
  }

  const transitionDuration = getTransitionDuration()

  // Construire le transform
  const buildTransform = (
    dndTransform?: { x: number; y: number } | null
  ): string | undefined => {
    if (dndTransform) {
      return `translate(${dndTransform.x}px, ${dndTransform.y + transformValues.y}px) scale(${transformValues.scale}) rotate(${transformValues.rotate}deg)`
    }
    if (isDragging || swapPhase !== 'idle') {
      return `translateY(${transformValues.y}px) scale(${transformValues.scale}) rotate(${transformValues.rotate}deg)`
    }
    return undefined
  }

  return {
    dragPhase,
    swapPhase,
    transformValues,
    transitionDuration,
    buildTransform,
  }
}
