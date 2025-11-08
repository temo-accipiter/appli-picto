// src/components/features/time-timer/TimeTimer.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/hooks'
import './TimeTimer.scss'

interface PresetDuration {
  label: string
  value: number
}

const PRESET_DURATIONS: PresetDuration[] = [
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
]

interface TimeTimerProps {
  compact?: boolean
  initialDuration?: number
  onComplete?: () => void
}

/**
 * Composant TimeTimer - Affichage visuel du temps qui passe
 * Conçu pour les enfants autistes (TSA) avec design apaisant
 *
 * @param compact - Mode compact pour affichage à côté d'autres composants
 * @param initialDuration - Durée initiale en minutes (optionnel)
 * @param onComplete - Callback appelé quand le timer se termine
 */
export default function TimeTimer({
  compact = false,
  initialDuration = 10,
  onComplete,
}: TimeTimerProps) {
  const { t } = useI18n()
  const [duration, setDuration] = useState(initialDuration) // Durée totale en minutes
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60) // Temps restant en secondes
  const [isRunning, setIsRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Calculer le pourcentage restant pour l'affichage visuel
  const percentage = (timeLeft / (duration * 60)) * 100

  // Formater le temps restant en MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Démarrer/Pause le timer
  const toggleTimer = useCallback(() => {
    setIsRunning(prev => !prev)
  }, [])

  // Réinitialiser le timer
  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(duration * 60)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [duration])

  // Changer la durée
  const changeDuration = useCallback((newDuration: number) => {
    setDuration(newDuration)
    setTimeLeft(newDuration * 60)
    setIsRunning(false)
    setShowSettings(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Effet pour gérer le décompte
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            // Jouer un son doux à la fin
            if (audioRef.current) {
              audioRef.current.play().catch(() => {
                // Ignorer les erreurs de lecture audio (autoplay policy)
              })
            }
            // Appeler le callback onComplete si défini
            if (onComplete) {
              onComplete()
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft, onComplete])

  // Calculer l'angle pour le SVG (cercle qui se vide)
  const radius = compact ? 60 : 100
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Déterminer la couleur selon le temps restant
  const getColor = () => {
    if (percentage > 50) return 'var(--color-success)'
    if (percentage > 20) return 'var(--color-warning)'
    return 'var(--color-danger)'
  }

  const containerClass = compact
    ? 'time-timer time-timer--compact'
    : 'time-timer time-timer--full'

  return (
    <div className={containerClass}>
      {/* Son de fin (doux et apaisant) - optionnel */}
      {/* Pour ajouter un son, placez un fichier audio dans /public/sounds/gentle-bell.mp3 */}
      <audio
        ref={audioRef}
        src="/sounds/gentle-bell.mp3"
        preload="none"
        aria-hidden="true"
        onError={() => {
          // Ignorer silencieusement si le fichier n'existe pas
          if (audioRef.current) {
            audioRef.current.src = ''
          }
        }}
      />

      {/* Affichage du cercle */}
      <div className="time-timer__circle-container">
        <svg
          className="time-timer__circle"
          viewBox={`0 0 ${(radius + 20) * 2} ${(radius + 20) * 2}`}
          aria-hidden="true"
        >
          {/* Cercle de fond */}
          <circle
            className="time-timer__circle-bg"
            cx={radius + 20}
            cy={radius + 20}
            r={radius}
            fill="none"
            stroke="var(--color-gray-light)"
            strokeWidth="12"
          />
          {/* Cercle de progression */}
          <circle
            className="time-timer__circle-progress"
            cx={radius + 20}
            cy={radius + 20}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${radius + 20} ${radius + 20})`}
            style={{
              transition: isRunning ? 'stroke-dashoffset 1s linear' : 'none',
            }}
          />
        </svg>

        {/* Affichage du temps au centre */}
        <div className="time-timer__time-display">
          <span
            className="time-timer__time-text"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatTime(timeLeft)}
          </span>
          {!compact && (
            <span className="time-timer__duration-label">/ {duration} min</span>
          )}
        </div>
      </div>

      {/* Contrôles */}
      <div className="time-timer__controls">
        <button
          className="time-timer__btn time-timer__btn--primary"
          onClick={toggleTimer}
          disabled={timeLeft === 0}
          aria-label={isRunning ? t('timeTimer.pause') : t('timeTimer.start')}
        >
          {isRunning ? (
            <>
              <span className="time-timer__icon">⏸</span>
              {!compact && <span>{t('timeTimer.pause')}</span>}
            </>
          ) : (
            <>
              <span className="time-timer__icon">▶</span>
              {!compact && <span>{t('timeTimer.start')}</span>}
            </>
          )}
        </button>

        <button
          className="time-timer__btn time-timer__btn--secondary"
          onClick={resetTimer}
          aria-label={t('timeTimer.reset')}
        >
          <span className="time-timer__icon">↻</span>
          {!compact && <span>{t('timeTimer.reset')}</span>}
        </button>

        <button
          className="time-timer__btn time-timer__btn--secondary"
          onClick={() => setShowSettings(!showSettings)}
          aria-label={t('timeTimer.settings')}
          aria-expanded={showSettings}
        >
          <span className="time-timer__icon">⚙</span>
          {!compact && <span>{t('timeTimer.duration')}</span>}
        </button>
      </div>

      {/* Panneau de réglages */}
      {showSettings && (
        <div
          className="time-timer__settings"
          role="region"
          aria-label={t('timeTimer.durationSettings')}
        >
          <h3 className="time-timer__settings-title">
            {t('timeTimer.selectDuration')}
          </h3>
          <div className="time-timer__preset-grid">
            {PRESET_DURATIONS.map(preset => (
              <button
                key={preset.value}
                className={`time-timer__preset-btn ${
                  duration === preset.value
                    ? 'time-timer__preset-btn--active'
                    : ''
                }`}
                onClick={() => changeDuration(preset.value)}
                aria-pressed={duration === preset.value}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message d'accessibilité */}
      <div className="sr-only" role="status" aria-live="polite">
        {timeLeft === 0 && t('timeTimer.completed')}
        {timeLeft > 0 && isRunning && t('timeTimer.running')}
        {timeLeft > 0 && !isRunning && t('timeTimer.paused')}
      </div>
    </div>
  )
}
