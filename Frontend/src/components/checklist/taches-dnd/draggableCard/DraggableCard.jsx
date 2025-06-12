/**
 * Composant : DraggableCard
 *
 * Rôle :
 *   Affiche une carte représentant une tâche avec :
 *     - son titre (tache.label)
 *     - une image (si existante)
 *     - une case à cocher custom pour marquer "fait"
 *   Permet de drag & drop via dnd-kit (useSortable).
 *   Joue un bip sonore lors de la coche si la tâche n'était pas faite (configurable).
 *
 * Props :
 *   - tache: { id: string|number, label: string, imagePath?: string, fait: boolean|number }
 *   - done: boolean            // indique si la tâche est cochée
 *   - toggleDone(id, wasDone): // callback pour inverser l'état "fait"
 *   - className: string        // classes CSS additionnelles
 *   - onClick(event): void     // callback sur le clic de la carte
 *   - audioFeedback: boolean|AudioContext // active/désactive le bip ou passe un contexte audio
 *
 * Utilisation du hook @dnd-kit/sortable :
 *   const { attributes, listeners, setNodeRef, transform, transition } =
 *     useSortable({ id: tache.id.toString() })
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './DraggableCard.scss'

// ⚡️ Génère un court bip via Web Audio API
function playBeep(audioCtx) {
  const osc = audioCtx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, audioCtx.currentTime)
  osc.connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.1)
}

function DraggableCard({ tache, done, toggleDone }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: tache.id.toString() })

  // — mémoriser le style pour éviter de recomputer à chaque render
  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition]
  )

  // — créer le contexte audio une seule fois
  const audioCtxRef = useRef(null)
  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext ||
      window.webkitAudioContext)()
  }, [])

  // — mémoriser le handler pour éviter de le recréer inutilement
  const handleCheck = useCallback(() => {
    if (!done && audioCtxRef.current) {
      playBeep(audioCtxRef.current)
    }
    toggleDone(tache.id, done)
  }, [done, tache.id, toggleDone])

  return (
    <div
      ref={setNodeRef}
      className={`card-tache ${done ? 'done' : ''}`}
      style={style}
      {...attributes}
      {...listeners}
    >
      <span>{tache.label}</span>
      {tache.imagePath && (
        <img
          src={`http://localhost:3001${tache.imagePath}`}
          alt={tache.label}
        />
      )}
      <input
        type="checkbox"
        name={`tache-fait-${tache.id}`}
        checked={done}
        onChange={handleCheck}
      />
    </div>
  )
}

DraggableCard.propTypes = {
  tache: PropTypes.object.isRequired,
  done: PropTypes.bool.isRequired,
  toggleDone: PropTypes.func.isRequired,
}

// React.memo pour qu’on ne rerende la carte que si ses props changent
export default React.memo(DraggableCard)
