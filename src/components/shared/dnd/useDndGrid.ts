'use client'

/**
 * Hook useDndGrid - Logique complète de drag & drop pour grilles
 *
 * Gère :
 * - handleDragStart : Création de la map de positions
 * - handleDragEnd : Swap items et sauvegarde asynchrone
 * - États : activeId, swappedPair
 * - Retry logic : 3 tentatives en cas d'erreur
 * - Batch save : Par 5 items pour optimiser les requêtes
 */

import { useState, useCallback } from 'react'
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core'

export interface UseDndGridOptions<T> {
  items: T[]
  onReorder: (newItems: T[]) => void
  onReorderPosition?: (
    itemId: string | number,
    newPos: number
  ) => Promise<void> | undefined
  getItemId?: ((item: T) => string | number) | undefined
  getItemIndex?: ((itemId: string | number) => number) | undefined
}

export interface UseDndGridReturn<T> {
  activeId: string | number | null
  swappedPair: [string | number, string | number] | null
  isDragging: boolean
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent) => Promise<void>
  reset: () => void
}

/**
 * Hook pour gérer la logique DnD d'une grille
 * @param options - Configuration (items, onReorder, etc.)
 * @returns Objet avec états et handlers
 */
export function useDndGrid<T>({
  items,
  onReorder,
  onReorderPosition,
  getItemId,
  getItemIndex,
}: UseDndGridOptions<T>): UseDndGridReturn<T> {
  // Defaults
  const _getItemId = getItemId || ((item: any) => item.id)
  const _getItemIndex =
    getItemIndex ||
    ((id: string | number) => items.findIndex(item => _getItemId(item) === id))
  const [activeId, setActiveId] = useState<string | number | null>(null)
  const [swappedPair, setSwappedPair] = useState<
    [string | number, string | number] | null
  >(null)
  const [isDragging, setIsDragging] = useState(false)
  const positionsMap = new Map<string | number, number>()

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      setActiveId(active.id as string | number)
      setIsDragging(true)

      // Créer la map des positions initiales
      items.forEach((item, index) => {
        positionsMap.set(_getItemId(item), index)
      })
    },
    [items, _getItemId]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setIsDragging(false)

      // Pas de drop sur un slot valide
      if (!over) {
        setActiveId(null)
        return
      }

      const activeIndex = _getItemIndex(active.id as string | number)
      const overIndex = _getItemIndex(over.id as string | number)

      // Pas de mouvement
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        setActiveId(null)
        return
      }

      // Marquer comme swappé pour animation
      setSwappedPair([active.id as string | number, over.id as string | number])
      setActiveId(null)

      // Créer la nouvelle liste après swap
      const newItems = Array.from(items)
      const temp = newItems[activeIndex]
      if (temp && newItems[overIndex]) {
        newItems[activeIndex] = newItems[overIndex]
        newItems[overIndex] = temp
      }

      // Callback immédiat (optimistic UI)
      onReorder(newItems)

      // Sauvegarder les positions async
      if (onReorderPosition) {
        const maxRetries = 3
        let retries = 0

        const savePositions = async () => {
          try {
            // Batch save par 5 items
            for (let i = 0; i < newItems.length; i += 5) {
              const batch = newItems.slice(i, i + 5)
              await Promise.all(
                batch.map((item, batchIndex) =>
                  onReorderPosition(_getItemId(item), i + batchIndex)
                )
              )
            }
            // Success - reset swap animation
            setTimeout(() => setSwappedPair(null), 1000)
          } catch (error) {
            if (retries < maxRetries) {
              retries++
              console.warn(`Retry ${retries}/${maxRetries} saving positions`)
              setTimeout(savePositions, 1000 * retries)
            } else {
              console.error('Failed to save positions after 3 retries', error)
              setSwappedPair(null)
            }
          }
        }

        savePositions()
      } else {
        // Si pas de onReorderPosition, reset animation après 1s
        setTimeout(() => setSwappedPair(null), 1000)
      }
    },
    [items, _getItemId, _getItemIndex, onReorder, onReorderPosition]
  )

  const reset = useCallback(() => {
    setActiveId(null)
    setSwappedPair(null)
    setIsDragging(false)
  }, [])

  return {
    activeId,
    swappedPair,
    isDragging,
    handleDragStart,
    handleDragEnd,
    reset,
  }
}
