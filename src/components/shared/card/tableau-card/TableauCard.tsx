'use client'

/**
 * Rôle :
 *   Affiche une carte représentant une tâche avec :
 *     - son titre (tache.label)
 *     - une image (si existante)
 *     - une case à cocher custom pour marquer "fait"
 *   Permet de drag & drop via dnd-kit (useDraggable).
 *   Joue un bip sonore lors de la coche si la tâche n'était pas faite (configurable).
 */

import { Checkbox, DemoSignedImage, SignedImage } from '@/components'
import { useDraggable } from '@dnd-kit/core'
import React, { useCallback, useRef } from 'react'
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
}

// 🔊 Bip sonore quand une tâche est cochée
function playBeep(audioCtx: AudioContext): void {
  try {
    // Vérifier que l'AudioContext est dans un état valide
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    if (audioCtx.state !== 'running') {
      return // Ne pas jouer si le contexte n'est pas prêt
    }

    const osc = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, audioCtx.currentTime)

    // Contrôler le volume pour éviter les sons trop forts
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)

    osc.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.1)

    // Nettoyer les nœuds après utilisation
    osc.onended = () => {
      osc.disconnect()
      gainNode.disconnect()
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ Erreur lors de la création du son:',
        (error as Error).message
      )
    }
  }
}

function TableauCard({
  tache,
  done,
  toggleDone,
  isDraggingGlobal = false,
}: TableauCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: tache.id.toString(),
    })

  // Style pour le drag avec animation fluide
  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    // Pas de transition pendant le drag pour un suivi précis du curseur
    transition: isDragging
      ? 'none'
      : 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease',
    touchAction: 'manipulation' as const,
    // Désactiver les pointer events sur les cartes non-draggées pendant un drag global
    pointerEvents:
      isDraggingGlobal && !isDragging ? ('none' as const) : ('auto' as const),
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  }
  // — créer le contexte audio seulement quand nécessaire (après interaction utilisateur)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current) {
      try {
        const AudioContextConstructor =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (AudioContextConstructor) {
          audioCtxRef.current = new AudioContextConstructor()
        }
        // Si le contexte est suspendu, on le reprend
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume()
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '⚠️ Impossible de créer AudioContext:',
            (error as Error).message
          )
        }
        return null
      }
    }
    return audioCtxRef.current
  }, [])

  // — mémoriser le handler pour éviter de le recréer inutilement
  const handleCheck = useCallback(() => {
    // Créer l'AudioContext seulement lors de la première interaction
    const audioCtx = getAudioContext()

    if (!done && audioCtx) {
      try {
        playBeep(audioCtx)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '⚠️ Erreur lors de la lecture audio:',
            (error as Error).message
          )
        }
      }
    }

    // Inverser l'état : si c'est fait, on le défait, et vice versa
    toggleDone(tache.id, !done)
  }, [done, tache.id, toggleDone, getAudioContext])

  return (
    <div
      ref={setNodeRef}
      className={`tableau-card ${done ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}
      style={style}
      {...attributes}
      {...listeners}
    >
      <span>{tache.label}</span>
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
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <Checkbox
          id={`tache-fait-${tache.id}`}
          checked={done}
          onChange={handleCheck}
          className="tableau-card__checkbox"
          size="md"
        />
      </div>
    </div>
  )
}

// ✅ Pour éviter les rerenders inutiles
export default React.memo(TableauCard)
