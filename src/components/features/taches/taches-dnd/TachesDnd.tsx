'use client'

/**
 *   Affiche une liste de tâches réordonnables par glisser-déposer
 *   avec possibilité de cocher/décocher chaque tâche et bouton de reset.
 *   Utilise un système de slots droppables avec échange de positions (swap).
 */

import { Button, ModalConfirm, TableauCard } from '@/components'
import { useI18n } from '@/hooks'
import type { Tache } from '@/types/global'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import {
  memo,
  useCallback,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react'
import './TachesDnd.scss'

interface TacheItem {
  id: string | number
  label: string
  fait: boolean | number
  imagepath?: string | null
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

// Génère les IDs de slots (slot0, slot1, slot2, ...)
const generateSlots = (count: number) =>
  Array.from({ length: count }, (_, i) => `slot${i}`)

// Composant DroppableSlot : zone de dépôt pour une carte
interface DroppableSlotProps {
  id: string
  children?: ReactNode
  isOver?: boolean
}

function DroppableSlot({ id, children }: DroppableSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`slot${isOver ? ' over' : ''}`}>
      {children}
    </div>
  )
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
  const [isDragging, setIsDragging] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  // Layout : mapping slot -> tâche ID (ou null si vide)
  const [layout, setLayout] = useState<Record<string, string | null>>({})

  // Ref pour tracker les IDs actuels et éviter les re-syncs inutiles
  const prevItemIdsRef = useRef<string>('')

  // Synchroniser le layout SEULEMENT quand les IDs changent (ajout/suppression)
  // pas quand l'ordre change (pour éviter les sauts visuels)
  useEffect(() => {
    const currentIds = items
      .map(item => item.id.toString())
      .sort()
      .join(',')

    // Ne re-sync que si les IDs ont changé (pas l'ordre)
    if (currentIds !== prevItemIdsRef.current) {
      prevItemIdsRef.current = currentIds

      const newLayout: Record<string, string | null> = {}
      items.forEach((item, index) => {
        newLayout[`slot${index}`] = item.id.toString()
      })
      setLayout(newLayout)
    }
  }, [items])

  // WCAG 2.1.1 - Support souris ET clavier pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Distance minimale pour activer le drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setIsDragging(true)
      const tache = items.find(t => t.id.toString() === active.id)
      if (tache) {
        setAnnouncement(`Déplacement de "${tache.label}"`)
      }
    },
    [items]
  )

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      // Si pas de cible valide ou même position
      if (!over || active.id === over.id) {
        setIsDragging(false)
        setAnnouncement('Déplacement annulé')
        return
      }

      const activeId = active.id as string
      const overId = over.id as string

      // Trouver le slot source (celui qui contient la carte draggée)
      const fromSlot = Object.keys(layout).find(key => layout[key] === activeId)

      // Le slot cible est soit le slot survolé, soit le slot de la carte survolée
      let toSlot = overId
      if (!overId.startsWith('slot')) {
        // overId est un ID de carte, trouver son slot
        toSlot =
          Object.keys(layout).find(key => layout[key] === overId) || overId
      }

      if (!fromSlot || fromSlot === toSlot) {
        setIsDragging(false)
        setAnnouncement('Déplacement annulé')
        return
      }

      // Effectuer le swap
      const cardAtDestination = layout[toSlot]

      setLayout(prev => {
        const newLayout = { ...prev }
        newLayout[fromSlot] = cardAtDestination ?? null
        newLayout[toSlot] = activeId
        return newLayout
      })

      // Reconstruire la liste ordonnée pour onReorder
      const newOrder = generateSlots(items.length)
        .map(slotId => {
          if (slotId === fromSlot) return cardAtDestination
          if (slotId === toSlot) return activeId
          return layout[slotId]
        })
        .filter((id): id is string => id !== null)

      onReorder(newOrder)

      // WCAG 4.1.3 - Annoncer le résultat de l'échange
      const movedTask = items.find(t => t.id.toString() === activeId)
      const swappedTask = cardAtDestination
        ? items.find(t => t.id.toString() === cardAtDestination)
        : null

      if (swappedTask) {
        setAnnouncement(
          `"${movedTask?.label}" échangé avec "${swappedTask.label}"`
        )
      } else {
        setAnnouncement(`"${movedTask?.label}" déplacé vers un slot vide`)
      }

      // Délai pour bloquer les clics accidentels après le drop
      setTimeout(() => {
        setIsDragging(false)
      }, 100)
    },
    [layout, items, onReorder]
  )

  // Nombre de slots = nombre d'items (pas de slots vides)
  const slots = generateSlots(items.length)

  // Si aucun item, ne rien afficher
  if (items.length === 0) {
    return null
  }

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
        <div className="grid-taches">
          {slots.map(slotId => {
            const cardId = layout[slotId]
            const tache = cardId
              ? items.find(t => t.id.toString() === cardId)
              : null

            return (
              <DroppableSlot key={slotId} id={slotId}>
                {tache && (
                  <TableauCard
                    tache={tache as unknown as Tache}
                    done={doneMap[tache.id] || false}
                    toggleDone={onToggle}
                    isDraggingGlobal={isDragging}
                  />
                )}
              </DroppableSlot>
            )
          })}
        </div>

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
