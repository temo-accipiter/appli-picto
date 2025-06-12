/**
 * Composant : ChecklistTachesDnd
 *
 * Rôle :
 *   Affiche une liste de tâches réordonnables par glisser-déposer
 *   avec possibilité de cocher/décocher chaque tâche et bouton de reset.
 *
 * Props :
 *   - items: Array<{
 *       id: string|number,
 *       label: string,
 *       fait: boolean|number
 *     }>
 *   - onReorder(newOrderIds: Array<string|number>): void
 *   - onToggle(id: string|number, wasDone: boolean): void
 *   - onReset(): void
 */

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import PropTypes from 'prop-types'
import Button from '@/components/button/Button'
import './ChecklistTachesDnd.scss'
import DraggableCard from '../draggableCard/DraggableCard'

export default function ChecklistTachesDnd({
  items,
  onReorder,
  onToggle,
  onReset,
  showResetButton = true,
}) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = useCallback(
    ({ active }) => setActiveId(active.id),
    []
  )

  const handleDragEnd = useCallback(
    ({ active, over }) => {
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((t) => t.id.toString() === active.id)
        const newIndex = items.findIndex((t) => t.id.toString() === over.id)
        const newList = [...items]
        const [moved] = newList.splice(oldIndex, 1)
        newList.splice(newIndex, 0, moved)
        onReorder(newList.map((t) => t.id))
      }
      setActiveId(null)
    },
    [items, onReorder]
  )

  const handleReset = useCallback(() => {
    onReset()
  }, [onReset])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((t) => t.id.toString())}
        strategy={rectSortingStrategy}
      >
        <div className="grid-taches">
          {items.map((t) => (
            <DraggableCard
              key={t.id}
              tache={t}
              done={Boolean(t.fait)}
              // onToggle attend (id, wasDone) pour répercuter le bon état :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
              toggleDone={onToggle}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId && (
          <DraggableCard
            tache={items.find((t) => t.id.toString() === activeId)}
            done={Boolean(
              items.find((t) => t.id.toString() === activeId)?.fait
            )}
            toggleDone={onToggle}
          />
        )}
      </DragOverlay>

      {showResetButton && (
        <div className="reset-all-zone">
          <Button onClick={handleReset} label="Réinitialiser" variant="reset" />
        </div>
      )}
    </DndContext>
  )
}

ChecklistTachesDnd.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      fait: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]).isRequired,
    })
  ).isRequired,
  showResetButton: PropTypes.bool,
  onReorder: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
}
