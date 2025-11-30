'use client'

/**
 * Rôle :
 *   Affiche une carte représentant une tâche avec :
 *     - son titre (tache.label)
 *     - une image (si existante)
 *     - une case à cocher custom pour marquer "fait"
 *   Permet de drag & drop via dnd-kit (useDraggable).
 *   Joue un bip sonore lors de la coche si la tâche n'était pas faite.
 */

import { Checkbox, DemoSignedImage, SignedImage } from '@/components'
import { useDraggable } from '@dnd-kit/core'
import { useCallback, memo } from 'react'
import { useDragAnimation, useAudioContext } from '@/hooks'
import './TableauCard.scss'

interface Tache {
  id: string | number
  label: string
  imagepath?: string | null
  isDemo?: boolean
}

interface TableauCardProps {
  tache: Tache
  done: boolean
  toggleDone: (id: string | number, newDone: boolean) => void
  isDraggingGlobal?: boolean
  isBeingSwapped?: boolean
  playSound?: boolean
}

function TableauCard({
  tache,
  done,
  toggleDone,
  isDraggingGlobal = false,
  isBeingSwapped = false,
  playSound = true,
}: TableauCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: tache.id.toString(),
    })

  // Utiliser les hooks extractd pour animations et audio
  const { transitionDuration, buildTransform } = useDragAnimation(
    isDragging,
    isBeingSwapped
  )
  const { playBeep } = useAudioContext()

  // Handler pour la checkbox - play beep et toggle done
  const handleCheck = useCallback(() => {
    // Jouer le bip seulement si la tâche n'était pas faite et que sound est activé
    if (!done && playSound) {
      playBeep(440) // La = 440 Hz
    }

    // Inverser l'état : si c'est fait, on le défait, et vice versa
    toggleDone(tache.id, !done)
  }, [done, playSound, playBeep, tache.id, toggleDone])

  // Style pour le drag avec animation fluide
  const style = {
    transform: buildTransform(transform),
    transition: `transform ${transitionDuration} cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow ${transitionDuration} ease-out, opacity 150ms ease`,
    touchAction: 'manipulation' as const,
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

  return (
    <div
      ref={setNodeRef}
      className={`tableau-card ${done ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}
      style={style}
      data-testid={`tableau-card-${tache.id}`}
      aria-label={`${tache.label}${done ? ' - fait' : ''}`}
      {...attributes}
      {...listeners}
    >
      <span className="tableau-card__label">{tache.label}</span>
      {tache.imagepath &&
        (tache.isDemo ? (
          <DemoSignedImage
            filePath={tache.imagepath}
            alt={tache.label}
            className="tableau-card__image img-size-lg"
          />
        ) : (
          <SignedImage
            filePath={tache.imagepath}
            bucket="images"
            alt={tache.label}
            size={100}
          />
        ))}

      {/* Wrapper pour isoler la checkbox des drag listeners */}
      <div
        className="tableau-card__checkbox-wrapper"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <Checkbox
          id={`tache-fait-${tache.id}`}
          checked={done}
          onChange={handleCheck}
          className="tableau-card__checkbox"
          size="md"
          aria-label={done ? 'Marquer comme non-fait' : 'Marquer comme fait'}
        />
      </div>
    </div>
  )
}

// ✅ Pour éviter les rerenders inutiles
export default memo(TableauCard)
