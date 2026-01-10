'use client'

// src/components/features/time-timer/TimeTimer.tsx
import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  useI18n,
  useTimerPreferences,
  useTimerSvgPath,
  useAudioContext,
  getNumberPosition,
} from '@/hooks'
import type { DiskColor } from '@/hooks/useTimerPreferences'
import { Modal } from '@/components'
import Separator from '@/components/shared/separator/Separator'
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

interface ColorOption {
  id: DiskColor
  label: string
  cssVar: string
  color: string
}

const COLOR_OPTIONS: ColorOption[] = [
  {
    id: 'red',
    label: 'Rouge',
    cssVar: 'var(--disk-color-red)',
    color: '#ef4444',
  },
  {
    id: 'blue',
    label: 'Bleu',
    cssVar: 'var(--disk-color-blue)',
    color: '#3b82f6',
  },
  {
    id: 'green',
    label: 'Vert',
    cssVar: 'var(--disk-color-green)',
    color: '#10b981',
  },
  {
    id: 'purple',
    label: 'Violet',
    cssVar: 'var(--disk-color-purple)',
    color: '#a855f7',
  },
]

interface TimeTimerProps {
  compact?: boolean
  initialDuration?: number
  onComplete?: () => void
  hideLabel?: boolean
  hideSettings?: boolean
}

/**
 * État du timer (useReducer)
 */
interface TimerState {
  duration: number // Durée totale en minutes
  timeLeft: number // Temps restant en secondes
  isRunning: boolean
  showSettings: boolean
}

type TimerAction =
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'TICK' }
  | { type: 'TOGGLE_RUNNING' }
  | { type: 'RESET' }
  | { type: 'STOP' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'CLOSE_SETTINGS' }

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'SET_DURATION':
      return {
        ...state,
        duration: action.payload,
        timeLeft: action.payload * 60,
        isRunning: false,
        showSettings: false,
      }
    case 'TICK':
      if (state.timeLeft <= 1) {
        return { ...state, timeLeft: 0, isRunning: false }
      }
      return { ...state, timeLeft: state.timeLeft - 1 }
    case 'TOGGLE_RUNNING':
      return { ...state, isRunning: !state.isRunning }
    case 'RESET':
      return {
        ...state,
        timeLeft: state.duration * 60,
        isRunning: false,
      }
    case 'STOP':
      return { ...state, isRunning: false }
    case 'TOGGLE_SETTINGS':
      return { ...state, showSettings: !state.showSettings }
    case 'CLOSE_SETTINGS':
      return { ...state, showSettings: false }
    default:
      return state
  }
}

/**
 * Composant TimeTimer - Affichage visuel du temps qui passe
 * Conçu pour les enfants autistes (TSA) avec design apaisant
 *
 * @param compact - Mode compact pour affichage à côté d'autres composants
 * @param initialDuration - Durée initiale en minutes (optionnel)
 * @param onComplete - Callback appelé quand le timer se termine
 * @param hideSettings - Masquer le bouton réglages (mode fullscreen)
 */
export default function TimeTimer({
  compact = false,
  initialDuration = 10,
  onComplete,
  hideLabel = false,
  hideSettings = false,
}: TimeTimerProps) {
  const { t } = useI18n()
  const { playSound } = useAudioContext()

  // Hook préférences (localStorage centralisé)
  const {
    preferences,
    updateSilentMode,
    updateLastDuration,
    updateDiskColor,
    updateShowNumbers,
    updateVibration,
  } = useTimerPreferences(initialDuration)

  // État du timer avec useReducer
  const [state, dispatch] = useReducer(timerReducer, {
    duration: preferences.lastDuration,
    timeLeft: preferences.lastDuration * 60,
    isRunning: false,
    showSettings: false,
  })

  const intervalRef = useRef<number | null>(null)

  // Calculer le pourcentage restant
  const percentage = (state.timeLeft / (state.duration * 60)) * 100

  // Hook SVG path (calculs géométriques)
  const { redDiskPath, dimensions } = useTimerSvgPath(percentage, compact)
  const { radius, svgSize, centerX, centerY } = dimensions

  // Formater le temps restant en MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Démarrer/Pause le timer
  const toggleTimer = useCallback(() => {
    dispatch({ type: 'TOGGLE_RUNNING' })
  }, [])

  // Réinitialiser le timer
  const resetTimer = useCallback(() => {
    dispatch({ type: 'RESET' })
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Changer la durée
  const changeDuration = useCallback(
    (newDuration: number) => {
      dispatch({ type: 'SET_DURATION', payload: newDuration })
      updateLastDuration(newDuration)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    },
    [updateLastDuration]
  )

  // Toggle mode silencieux
  const toggleSilentMode = useCallback(() => {
    updateSilentMode(!preferences.isSilentMode)
  }, [preferences.isSilentMode, updateSilentMode])

  // Toggle affichage numéros
  const toggleShowNumbers = useCallback(() => {
    updateShowNumbers(!preferences.showNumbers)
  }, [preferences.showNumbers, updateShowNumbers])

  // Toggle vibration
  const toggleVibration = useCallback(() => {
    updateVibration(!preferences.enableVibration)
  }, [preferences.enableVibration, updateVibration])

  // Changer la couleur du disque
  const changeDiskColor = useCallback(
    (color: DiskColor) => {
      updateDiskColor(color)
    },
    [updateDiskColor]
  )

  // Effet pour gérer le décompte
  useEffect(() => {
    if (state.isRunning && state.timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        dispatch({ type: 'TICK' })
      }, 1000)
    } else if (!state.isRunning && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [state.isRunning, state.timeLeft])

  // Effet pour gérer la fin du timer
  useEffect(() => {
    if (state.timeLeft === 0 && !state.isRunning) {
      // Jouer un son doux (seulement si mode silencieux désactivé)
      if (!preferences.isSilentMode) {
        playSound('/sounds/timer-complete.wav', 0.5)
      }

      // Vibration à la fin (mobile uniquement)
      if (
        preferences.enableVibration &&
        typeof navigator !== 'undefined' &&
        navigator.vibrate
      ) {
        navigator.vibrate([200, 100, 200])
      }

      // Appeler le callback onComplete si défini
      if (onComplete) {
        onComplete()
      }
    }
  }, [
    state.timeLeft,
    state.isRunning,
    preferences.isSilentMode,
    preferences.enableVibration,
    playSound,
    onComplete,
  ])

  // Obtenir la couleur du disque selon la sélection
  const getDiskColor = () => {
    const selectedColor = COLOR_OPTIONS.find(c => c.id === preferences.diskColor)
    return selectedColor ? selectedColor.cssVar : 'var(--disk-color-red)'
  }

  // Numéros autour du cadran (0, 5, 10, 15...60)
  const timeMarkers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  const containerClass = compact
    ? 'time-timer time-timer--compact'
    : 'time-timer time-timer--full'

  return (
    <div className={containerClass}>
      {/* Affichage du Time Timer (disque rouge secteur circulaire) */}
      <div className="time-timer__circle-container">
        <svg
          className="time-timer__circle"
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          aria-hidden="true"
        >
          {/* Cercle de fond blanc avec bordure noire */}
          <circle
            className="time-timer__circle-bg"
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="white"
            stroke="#1f2937"
            strokeWidth="3"
          />

          {/* Disque secteur circulaire (temps restant) */}
          {percentage > 0 && (
            <path
              className="time-timer__red-disk"
              d={redDiskPath}
              fill={getDiskColor()}
              opacity="0.9"
            />
          )}

          {/* Numéros autour du cadran (conditionnels - uniquement pour 60 min) */}
          {preferences.showNumbers &&
            state.duration === 60 &&
            timeMarkers.map(value => {
              const pos = getNumberPosition(value, radius, centerX, centerY, compact)
              return (
                <text
                  key={value}
                  x={pos.x}
                  y={pos.y}
                  className="time-timer__number"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#1f2937"
                  fontSize={compact ? '10' : '14'}
                  fontWeight="600"
                >
                  {value}
                </text>
              )
            })}
        </svg>

        {/* Affichage du temps au centre */}
        <div className="time-timer__time-display">
          <span
            className="time-timer__time-text"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatTime(state.timeLeft)}
          </span>
          {!compact && !hideLabel && (
            <span className="time-timer__duration-label">/ {state.duration} min</span>
          )}
        </div>
      </div>

      {/* Contrôles */}
      <div className="time-timer__controls">
        <button
          className="time-timer__btn time-timer__btn--primary skip-min-touch-target"
          onClick={toggleTimer}
          disabled={state.timeLeft === 0}
          aria-label={state.isRunning ? t('timeTimer.pause') : t('timeTimer.start')}
        >
          {state.isRunning ? (
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
          className="time-timer__btn time-timer__btn--secondary skip-min-touch-target"
          onClick={resetTimer}
          aria-label={t('timeTimer.reset')}
        >
          <span className="time-timer__icon">↻</span>
          {!compact && <span>{t('timeTimer.reset')}</span>}
        </button>

        {!hideSettings && (
          <button
            className="time-timer__btn time-timer__btn--secondary skip-min-touch-target"
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
            aria-label={t('timeTimer.settings')}
            aria-expanded={state.showSettings}
          >
            <span className="time-timer__icon">⚙</span>
            {!compact && <span>{t('timeTimer.settings')}</span>}
          </button>
        )}
      </div>

      {/* Modal de réglages */}
      <Modal
        isOpen={state.showSettings}
        onClose={() => dispatch({ type: 'CLOSE_SETTINGS' })}
        title={t('timeTimer.settings')}
        size="small"
        showCloseButton={true}
        closeOnOverlay={true}
        closeOnEscape={true}
      >
        <div className="time-timer__settings-modal">
          {/* Sélection de la durée */}
          <div className="time-timer__settings-section">
            <h3 className="time-timer__settings-subtitle">
              {t('timeTimer.selectDuration')}
            </h3>
            <div className="time-timer__preset-grid">
              {PRESET_DURATIONS.map(preset => (
                <button
                  key={preset.value}
                  className={`time-timer__preset-btn ${
                    state.duration === preset.value
                      ? 'time-timer__preset-btn--active'
                      : ''
                  }`}
                  onClick={() => changeDuration(preset.value)}
                  aria-pressed={state.duration === preset.value}
                >
                  {preset.label}
                </button>
              ))}

              {/* Input personnalisé intégré après 60 min */}
              <input
                type="number"
                min="1"
                max="999"
                placeholder="⏱️ min"
                className="time-timer__custom-input"
                id="custom-duration-input"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const value = parseInt(e.currentTarget.value, 10)
                    if (value > 0 && value <= 999) {
                      changeDuration(value)
                      e.currentTarget.value = ''
                    }
                  }
                }}
              />

              {/* Bouton validation durée personnalisée */}
              <button
                className="time-timer__preset-btn time-timer__validate-custom-btn"
                onClick={() => {
                  const input = document.getElementById(
                    'custom-duration-input'
                  ) as HTMLInputElement
                  if (input) {
                    const value = parseInt(input.value, 10)
                    if (value > 0 && value <= 999) {
                      changeDuration(value)
                      input.value = ''
                    }
                  }
                }}
                aria-label="Valider la durée personnalisée"
                title="Valider"
              >
                ✓
              </button>
            </div>
          </div>

          <Separator />

          {/* Option sonore */}
          <div className="time-timer__settings-section">
            <label className="time-timer__checkbox-label">
              <input
                type="checkbox"
                checked={!preferences.isSilentMode}
                onChange={toggleSilentMode}
                className="time-timer__checkbox"
              />
              <span className="time-timer__checkbox-text">
                🔔{' '}
                {preferences.isSilentMode
                  ? 'Activer la sonnerie'
                  : 'Désactiver la sonnerie'}
              </span>
            </label>
            <p className="time-timer__settings-hint">
              Joue un son doux à la fin du timer
            </p>
          </div>

          <Separator />

          {/* Choix de la couleur du disque */}
          <div className="time-timer__settings-section">
            <h3 className="time-timer__settings-subtitle">
              🎨 {t('timeTimer.diskColor')}
            </h3>
            <div className="time-timer__color-grid">
              {COLOR_OPTIONS.map(colorOption => (
                <button
                  key={colorOption.id}
                  className={`time-timer__color-btn ${
                    preferences.diskColor === colorOption.id
                      ? 'time-timer__color-btn--selected'
                      : ''
                  }`}
                  onClick={() => changeDiskColor(colorOption.id)}
                  aria-pressed={preferences.diskColor === colorOption.id}
                  aria-label={colorOption.label}
                  data-color={colorOption.id}
                >
                  <span
                    className="time-timer__color-swatch"
                    style={{ backgroundColor: colorOption.color }}
                  />
                  <span className="time-timer__color-label">
                    {colorOption.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Option afficher/masquer chiffres horaires */}
          <div className="time-timer__settings-section">
            <label
              className={`time-timer__checkbox-label ${
                state.duration !== 60 ? 'time-timer__checkbox-label--disabled' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={preferences.showNumbers}
                onChange={toggleShowNumbers}
                disabled={state.duration !== 60}
                className="time-timer__checkbox"
              />
              <span className="time-timer__checkbox-text">
                🔢{' '}
                {preferences.showNumbers
                  ? 'Masquer les chiffres horaires'
                  : 'Afficher les chiffres horaires'}
              </span>
            </label>
            {state.duration !== 60 && (
              <p className="time-timer__settings-hint time-timer__settings-hint--info">
                💡 Les chiffres horaires ne s&apos;affichent qu&apos;avec une
                durée de 60 minutes
              </p>
            )}
          </div>

          <Separator />

          {/* Option vibration (mobile uniquement) */}
          {typeof navigator !== 'undefined' && 'vibrate' in navigator && (
            <div className="time-timer__settings-section">
              <label className="time-timer__checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.enableVibration}
                  onChange={toggleVibration}
                  className="time-timer__checkbox"
                />
                <span className="time-timer__checkbox-text">
                  📳{' '}
                  {preferences.enableVibration
                    ? 'Désactiver la vibration'
                    : 'Activer la vibration'}
                </span>
              </label>
              <p className="time-timer__settings-hint">
                Vibration à la fin du timer (mobile uniquement)
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Message d'accessibilité */}
      <div className="sr-only" role="status" aria-live="polite">
        {state.timeLeft === 0 && t('timeTimer.completed')}
        {state.timeLeft > 0 && state.isRunning && t('timeTimer.running')}
        {state.timeLeft > 0 && !state.isRunning && t('timeTimer.paused')}
      </div>
    </div>
  )
}
