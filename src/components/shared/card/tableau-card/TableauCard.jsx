/**
 * Rôle :
 *   Affiche une carte représentant une tâche avec :
 *     - son titre (tache.label)
 *     - une image (si existante)
 *     - une case à cocher custom pour marquer "fait"
 *   Permet de drag & drop via dnd-kit (useSortable).
 *   Joue un bip sonore lors de la coche si la tâche n'était pas faite (configurable).
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SignedImage, Checkbox } from '@/components'
import './TableauCard.scss'

// 🔊 Bip sonore quand une tâche est cochée
function playBeep(audioCtx) {
  const osc = audioCtx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, audioCtx.currentTime)
  osc.connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.1)
}

function TableauCard({ tache, done, toggleDone }) {
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
      {tache.imagepath && (
        <SignedImage
          filePath={tache.imagepath}
          alt={tache.label}
          size={150}
          className="tableau-card__image"
        />
      )}

      <Checkbox
        id={`tache-fait-${tache.id}`}
        checked={done}
        onChange={handleCheck}
        className="tableau-card__checkbox"
        size="md"
      />
    </div>
  )
}

TableauCard.propTypes = {
  tache: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
    imagepath: PropTypes.string,
  }).isRequired,
  done: PropTypes.bool.isRequired,
  toggleDone: PropTypes.func.isRequired,
}

// ✅ Pour éviter les rerenders inutiles
export default React.memo(TableauCard)
