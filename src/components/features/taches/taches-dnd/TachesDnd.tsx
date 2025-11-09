/**
 *   Affiche une liste de tâches réordonnables par glisser-déposer
 *   avec possibilité de cocher/décocher chaque tâche et bouton de reset.
 */

import { Button, ModalConfirm, TableauCard } from '@/components'
import { useI18n } from '@/hooks'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor, // WCAG 2.1.1 - Support clavier pour drag & drop
  useSensor,
  useSensors,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates, // WCAG 2.1.1 - Coordonnées clavier
} from '@dnd-kit/sortable'
import { memo, useCallback, useMemo, useState } from 'react'
import './TachesDnd.scss'

interface TacheItem {
  id: string | number
  label: string
  fait: boolean | number
  imagepath?: string
  isDemo?: boolean
}

interface DoneMap {
  [key: string]: boolean
  [key: number]: boolean
}

interface ChecklistTachesDndProps {
  items: TacheItem[]
  onReorder: (ids: (string | number)[]) => void
  onToggle: (id: string | number, newDone: boolean) => void
  onReset: () => void
  showResetButton?: boolean
  doneMap?: DoneMap
}

const ChecklistTachesDnd = memo(function ChecklistTachesDnd({
  items,
  onReorder,
  onToggle,
  onReset,
  showResetButton = true,
  doneMap = {},
}: ChecklistTachesDndProps) {
  const { t } = useI18n()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [announcement, setAnnouncement] = useState('') // WCAG 4.1.3 - Annonces lecteur d'écran

  // WCAG 2.1.1 - Support souris ET clavier pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setActiveId(active.id as string)
      const tache = items.find(t => t.id.toString() === active.id)
      if (tache) {
        // WCAG 4.1.3 - Annoncer le début du drag (fallback si traduction manquante)
        setAnnouncement(`Déplacement de "${tache.label}"`)
      }
    },
    [items]
  )

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex(t => t.id.toString() === active.id)
        const newIndex = items.findIndex(t => t.id.toString() === over.id)
        const newList = [...items]
        const [moved] = newList.splice(oldIndex, 1)
        newList.splice(newIndex, 0, moved)
        onReorder(newList.map(t => t.id))

        // WCAG 4.1.3 - Annoncer le résultat du réordonnancement
        setAnnouncement(
          `"${moved.label}" déplacé à la position ${newIndex + 1}`
        )
      } else {
        // WCAG 4.1.3 - Annoncer l'annulation
        setAnnouncement('Déplacement annulé')
      }
      setActiveId(null)
    },
    [items, onReorder]
  )

  // Mémoïser la liste des IDs pour SortableContext
  const sortableItems = useMemo(() => items.map(t => t.id.toString()), [items])

  const activeTache = activeId
    ? items.find(t => t.id.toString() === activeId)
    : undefined

  return (
    <>
      {/* WCAG 4.1.3 - Région d'annonces pour lecteur d'écran */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
          <div className="grid-taches">
            {items.map(t => (
              <TableauCard
                key={t.id}
                tache={t}
                done={doneMap[t.id] || false}
                toggleDone={onToggle}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId && activeTache && (
            <TableauCard
              tache={activeTache}
              done={doneMap[activeId] || false}
              toggleDone={onToggle}
            />
          )}
        </DragOverlay>

        {showResetButton && items.length > 0 && (
          <div className="reset-all-zone">
            <Button
              label={t('tableau.reset')}
              onClick={() => setShowConfirm(true)}
            />
            <ModalConfirm
              isOpen={showConfirm}
              onClose={() => setShowConfirm(false)}
              confirmLabel={t('actions.confirm')}
              onConfirm={() => {
                setShowConfirm(false)
                onReset()
              }}
            >
              ❗ {t('edition.confirmResetAll')}
            </ModalConfirm>
          </div>
        )}
      </DndContext>
    </>
  )
})

ChecklistTachesDnd.displayName = 'ChecklistTachesDnd'

export default ChecklistTachesDnd
