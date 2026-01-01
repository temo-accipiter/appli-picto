'use client'

// src/components/features/time-timer/FloatingTimeTimer.tsx
import React, { useCallback, useEffect, useState } from 'react'
import { useDisplay } from '@/contexts/DisplayContext'
import { useSimpleRole } from '@/hooks'
import TimeTimer from './TimeTimer'
import './FloatingTimeTimer.scss'

interface FloatingTimeTimerProps {
  onComplete?: () => void
}

/**
 * Time Timer flottant et déplaçable
 * Peut être positionné librement sur l'écran (drag & drop compatible mouse + touch)
 * Position sauvegardée dans localStorage
 */
export default function FloatingTimeTimer({
  onComplete,
}: FloatingTimeTimerProps) {
  // Contexte d'affichage pour synchroniser avec la checkbox des paramètres
  const { setShowTimeTimer } = useDisplay()

  // Vérifier le rôle de l'utilisateur - ne pas afficher pour les visiteurs
  const { ready, isVisitor } = useSimpleRole()

  // Calculer la taille du timer selon la largeur de l'écran (responsive)
  const getTimerSize = useCallback(() => {
    if (typeof window === 'undefined') return 240

    const width = window.innerWidth
    if (width < 768) return 240 // Mobile
    if (width < 1024) return 300 // Tablette
    return 400 // Desktop
  }, [])

  // Calculer la hauteur totale du composant (cercle + boutons + gaps)
  const getTotalHeight = useCallback(() => {
    if (typeof window === 'undefined') return 300

    const circleSize = getTimerSize() // Taille du cercle
    const buttonsAndGap = 60 // Hauteur boutons + gap (permet au timer de toucher le bord)
    return circleSize + buttonsAndGap
  }, [getTimerSize])

  // Position par défaut (coin inférieur droit sur mobile, desktop adaptatif)
  const getDefaultPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 20, y: 20 }

    const timerWidth = getTimerSize()
    const timerHeight = getTotalHeight()
    const margin = 20

    // Coin inférieur droit avec marges
    return {
      x: window.innerWidth - timerWidth - margin,
      y: window.innerHeight - timerHeight - margin,
    }
  }, [getTimerSize, getTotalHeight])

  // Charger la position depuis localStorage
  const loadPosition = useCallback(() => {
    if (typeof window === 'undefined') return getDefaultPosition()
    const saved = localStorage.getItem('timeTimer_position')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return getDefaultPosition()
      }
    }
    return getDefaultPosition()
  }, [getDefaultPosition])

  const [position, setPosition] = useState(loadPosition())
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = useState(false) // Track si drag a vraiment bougé
  const [isMinimized, setIsMinimized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Sauvegarder la position dans localStorage
  const savePosition = useCallback((pos: { x: number; y: number }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeTimer_position', JSON.stringify(pos))
    }
  }, [])

  // Gérer le début du drag (mouse)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return // Ignorer si clic sur bouton

      setIsDragging(true)
      setHasMoved(false) // Reset flag mouvement
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    },
    [position]
  )

  // Gérer le début du drag (touch)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return // Ignorer si tap sur bouton

      const touch = e.touches[0]
      if (!touch) return // Protection TypeScript

      setIsDragging(true)
      setHasMoved(false) // Reset flag mouvement
      setDragOffset({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      })
    },
    [position]
  )

  // Gérer le déplacement (mouse)
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setHasMoved(true) // Marquer qu'il y a eu mouvement
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      // Contraintes : garder le timer entièrement dans l'écran (y compris boutons)
      const timerWidth = getTimerSize()
      const timerHeight = getTotalHeight()
      const maxX = window.innerWidth - timerWidth
      const maxY = window.innerHeight - timerHeight

      const constrainedPos = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      }

      setPosition(constrainedPos)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      savePosition(position)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    isDragging,
    dragOffset,
    savePosition,
    position,
    getTimerSize,
    getTotalHeight,
  ])

  // Gérer le déplacement (touch)
  useEffect(() => {
    if (!isDragging) return

    const handleTouchMove = (e: TouchEvent) => {
      setHasMoved(true) // Marquer qu'il y a eu mouvement
      const touch = e.touches[0]
      if (!touch) return // Protection TypeScript

      const newX = touch.clientX - dragOffset.x
      const newY = touch.clientY - dragOffset.y

      // Contraintes : garder le timer entièrement dans l'écran (y compris boutons)
      const timerWidth = getTimerSize()
      const timerHeight = getTotalHeight()
      const maxX = window.innerWidth - timerWidth
      const maxY = window.innerHeight - timerHeight

      const constrainedPos = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      }

      setPosition(constrainedPos)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
      savePosition(position)
    }

    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [
    isDragging,
    dragOffset,
    savePosition,
    position,
    getTimerSize,
    getTotalHeight,
  ])

  // Gérer la fermeture - décoche le time timer dans les paramètres
  const handleClose = () => {
    // Décoche la checkbox du time timer dans edition/paramètres
    setShowTimeTimer(false)
    // Note: Le composant sera démonté par le parent qui vérifie showTimeTimer
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      setIsMinimized(false) // Si on passe en plein écran, on agrandit
    }
  }

  // Bloquer le scroll quand en mode plein écran (isolement total TSA-friendly)
  useEffect(() => {
    if (isFullscreen) {
      // Bloquer le scroll du body
      document.body.style.overflow = 'hidden'
    } else {
      // Restaurer le scroll
      document.body.style.overflow = ''
    }

    // Cleanup : restaurer le scroll au démontage
    return () => {
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  const containerClasses = [
    'floating-time-timer',
    isDragging && 'floating-time-timer--dragging',
    isMinimized && 'floating-time-timer--minimized',
    isFullscreen && 'floating-time-timer--fullscreen',
  ]
    .filter(Boolean)
    .join(' ')

  // Ne pas afficher le timer pour les visiteurs (après tous les hooks)
  if (!ready) return null // Attendre le chargement du rôle
  if (isVisitor) return null // Masquer pour les visiteurs

  return (
    <div
      className={containerClasses}
      style={
        isFullscreen
          ? {
              left: 0,
              top: 0,
              width: '100vw',
              height: '100vh',
              position: 'fixed',
            }
          : {
              left: `${position.x}px`,
              top: `${position.y}px`,
            }
      }
      onMouseDown={!isFullscreen ? handleMouseDown : undefined}
      onTouchStart={!isFullscreen ? handleTouchStart : undefined}
    >
      {/* Boutons contrôle macOS (en haut à gauche) */}
      <div className="floating-time-timer__window-controls">
        <button
          className="floating-time-timer__window-btn floating-time-timer__window-btn--close skip-min-touch-target"
          onClick={handleClose}
          aria-label="Fermer"
          title="Fermer"
        >
          <span className="floating-time-timer__window-btn-icon">×</span>
        </button>
        <button
          className="floating-time-timer__window-btn floating-time-timer__window-btn--minimize skip-min-touch-target"
          onClick={() => setIsMinimized(!isMinimized)}
          aria-label={isMinimized ? 'Agrandir' : 'Minimiser'}
          title={isMinimized ? 'Agrandir' : 'Minimiser'}
        >
          <span className="floating-time-timer__window-btn-icon">−</span>
        </button>
        <button
          className="floating-time-timer__window-btn floating-time-timer__window-btn--fullscreen skip-min-touch-target"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Sortir du plein écran' : 'Plein écran'}
          title={isFullscreen ? 'Sortir du plein écran' : 'Plein écran'}
        >
          <span className="floating-time-timer__window-btn-icon">
            {isFullscreen ? '⤓' : '⤢'}
          </span>
        </button>
      </div>

      {/* Time Timer - toujours monté pour continuer en arrière-plan */}
      <div
        className={`floating-time-timer__content ${
          isMinimized ? 'floating-time-timer__content--hidden' : ''
        }`}
      >
        <TimeTimer
          compact={!isFullscreen}
          hideLabel={isFullscreen}
          {...(onComplete && { onComplete })}
        />
      </div>

      {/* Version minimisée (juste l'icône) */}
      {isMinimized && (
        <div
          className="floating-time-timer__minimized-content"
          onClick={() => {
            // N'agrandir que si pas de mouvement (clic, pas drag)
            if (!hasMoved) {
              setIsMinimized(false)
            }
          }}
          role="button"
          aria-label="Agrandir le Time Timer"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsMinimized(false)
            }
          }}
        >
          <span className="floating-time-timer__icon">⏱</span>
        </div>
      )}
    </div>
  )
}
