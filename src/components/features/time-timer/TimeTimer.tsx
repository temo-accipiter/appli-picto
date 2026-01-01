'use client'

// src/components/features/time-timer/TimeTimer.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/hooks'
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

type DiskColor = 'red' | 'blue' | 'green' | 'purple'

interface ColorOption {
  id: DiskColor
  label: string
  cssVar: string
  color: string // Couleur réelle pour l'affichage
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
  hideLabel?: boolean // Masquer le label "/ X min" (utile en fullscreen)
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
  hideLabel = false,
}: TimeTimerProps) {
  const { t } = useI18n()

  // Charger les préférences depuis localStorage
  const loadPreferences = () => {
    if (typeof window === 'undefined')
      return {
        silent: false,
        lastDuration: initialDuration,
        diskColor: 'red' as DiskColor,
        showNumbers: true,
        vibrate: false,
      }
    const silent = localStorage.getItem('timeTimer_silentMode') === 'true'
    const lastDuration = parseInt(
      localStorage.getItem('timeTimer_lastDuration') || String(initialDuration),
      10
    )
    const diskColor = (localStorage.getItem('timeTimer_diskColor') ||
      'red') as DiskColor
    const showNumbers =
      localStorage.getItem('timeTimer_showNumbers') !== 'false'
    const vibrate = localStorage.getItem('timeTimer_vibrate') === 'true'
    return { silent, lastDuration, diskColor, showNumbers, vibrate }
  }

  const preferences = loadPreferences()

  const [duration, setDuration] = useState(preferences.lastDuration) // Durée totale en minutes
  const [timeLeft, setTimeLeft] = useState(preferences.lastDuration * 60) // Temps restant en secondes
  const [isRunning, setIsRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSilentMode, setIsSilentMode] = useState(preferences.silent) // Mode silencieux
  const [diskColor, setDiskColor] = useState<DiskColor>(preferences.diskColor) // Couleur du disque
  const [showNumbers, setShowNumbers] = useState(preferences.showNumbers) // Afficher numéros
  const [enableVibration, setEnableVibration] = useState(preferences.vibrate) // Vibration mobile
  const [customDurations, setCustomDurations] = useState<number[]>([]) // Durées personnalisées
  const intervalRef = useRef<number | null>(null)

  // Fonction pour jouer un son de cloche doux depuis fichier audio
  const playCompletionSound = useCallback(() => {
    try {
      // Charger et jouer le fichier audio
      const audio = new Audio('/sounds/timer-complete.wav')
      audio.volume = 0.5 // Volume modéré (TSA-friendly)
      audio.play().catch(error => {
        // Ignorer silencieusement si lecture audio échoue
        console.warn('Lecture audio échouée:', error)
      })
    } catch (error) {
      // Ignorer silencieusement si Audio API non disponible
      console.warn('Audio API non disponible:', error)
    }
  }, [])

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
    // Sauvegarder dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeTimer_lastDuration', String(newDuration))
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Toggle mode silencieux
  const toggleSilentMode = useCallback(() => {
    setIsSilentMode(prev => {
      const newValue = !prev
      // Sauvegarder dans localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('timeTimer_silentMode', String(newValue))
      }
      return newValue
    })
  }, [])

  // Changer la couleur du disque
  const changeDiskColor = useCallback((color: DiskColor) => {
    setDiskColor(color)
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeTimer_diskColor', color)
    }
  }, [])

  // Toggle affichage numéros
  const toggleShowNumbers = useCallback(() => {
    setShowNumbers(prev => {
      const newValue = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('timeTimer_showNumbers', String(newValue))
      }
      return newValue
    })
  }, [])

  // Toggle vibration
  const toggleVibration = useCallback(() => {
    setEnableVibration(prev => {
      const newValue = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('timeTimer_vibrate', String(newValue))
      }
      return newValue
    })
  }, [])

  // Ajouter une durée personnalisée (préfixé _ car non utilisé actuellement)
  const _addCustomDuration = useCallback(
    (minutes: number) => {
      if (minutes > 0 && minutes <= 999 && !customDurations.includes(minutes)) {
        const updated = [...customDurations, minutes].sort((a, b) => a - b)
        setCustomDurations(updated)
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'timeTimer_customDurations',
            JSON.stringify(updated)
          )
        }
      }
    },
    [customDurations]
  )

  // Supprimer une durée personnalisée (préfixé _ car non utilisé actuellement)
  const _removeCustomDuration = useCallback(
    (minutes: number) => {
      const updated = customDurations.filter(d => d !== minutes)
      setCustomDurations(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'timeTimer_customDurations',
          JSON.stringify(updated)
        )
      }
    },
    [customDurations]
  )

  // Effet pour gérer le décompte
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            // Jouer un son doux à la fin (seulement si mode silencieux désactivé)
            if (!isSilentMode) {
              playCompletionSound()
            }
            // Vibration à la fin (mobile uniquement)
            if (
              enableVibration &&
              typeof navigator !== 'undefined' &&
              navigator.vibrate
            ) {
              navigator.vibrate([200, 100, 200])
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
  }, [
    isRunning,
    timeLeft,
    onComplete,
    enableVibration,
    playCompletionSound,
    isSilentMode,
  ])

  // Charger les durées personnalisées depuis localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeTimer_customDurations')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setCustomDurations(parsed)
          }
        } catch {
          // Ignorer erreurs parsing
        }
      }
    }
  }, [])

  // Calculer l'angle pour le SVG (disque rouge secteur circulaire)
  // Radius agrandi pour remplir plus d'espace
  const radius = compact ? 70 : 130
  // Marge pour les chiffres et espace de respiration (éviter clipping)
  const margin = compact ? 25 : 30
  // Taille totale du SVG (viewBox)
  const svgSize = 2 * (radius + margin)
  // Centre du SVG (au milieu)
  const centerX = svgSize / 2
  const centerY = svgSize / 2

  // Convertir le pourcentage en angle (0° = haut, sens horaire)
  // 100% = 360°, 0% = 0°
  const angle = (percentage / 100) * 360

  // Fonction pour convertir coordonnées polaires en cartésiennes
  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    }
  }

  // Fonction pour créer le path SVG du secteur circulaire
  const describeArc = (
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle)
    const end = polarToCartesian(centerX, centerY, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

    return [
      'M',
      centerX,
      centerY,
      'L',
      start.x,
      start.y,
      'A',
      radius,
      radius,
      0,
      largeArcFlag,
      0, // Sweep-flag à 0 pour sens anti-horaire (blanc apparaît de 0 vers 15)
      end.x,
      end.y,
      'Z',
    ].join(' ')
  }

  // Créer le path pour le disque rouge (secteur circulaire)
  // Réduire le rayon de 2px pour que le disque reste à l'intérieur du cercle blanc (strokeWidth = 3)
  const diskRadius = radius - 2
  // Le rouge part de la position du temps écoulé (360 - angle) et va jusqu'à 360° (= 0°)
  // Ainsi le blanc apparaît progressivement de 0° (haut) vers la droite
  const elapsedAngle = 360 - angle
  const redDiskPath =
    angle > 0 ? describeArc(centerX, centerY, diskRadius, elapsedAngle, 360) : ''

  // Numéros autour du cadran (0, 5, 10, 15...60)
  const timeMarkers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  // Calculer la position des numéros autour du cadran
  const getNumberPosition = (value: number) => {
    // Convertir la valeur en angle (0 = haut, sens horaire)
    // 0 min = 0°, 60 min = 360°
    const angleInDegrees = (value / 60) * 360 - 90 // -90 pour commencer en haut
    const angleInRadians = (angleInDegrees * Math.PI) / 180
    const numberRadius = radius + (compact ? 12 : 18) // Distance du centre

    return {
      x: centerX + numberRadius * Math.cos(angleInRadians),
      y: centerY + numberRadius * Math.sin(angleInRadians),
    }
  }

  // Obtenir la couleur du disque selon la sélection
  const getDiskColor = () => {
    const selectedColor = COLOR_OPTIONS.find(c => c.id === diskColor)
    return selectedColor ? selectedColor.cssVar : 'var(--disk-color-red)'
  }

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
          {angle > 0 && (
            <path
              className="time-timer__red-disk"
              d={redDiskPath}
              fill={getDiskColor()}
              opacity="0.9"
            />
          )}

          {/* Numéros autour du cadran (conditionnels - uniquement pour 60 min) */}
          {showNumbers &&
            duration === 60 &&
            timeMarkers.map(value => {
              const pos = getNumberPosition(value)
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
            {formatTime(timeLeft)}
          </span>
          {!compact && !hideLabel && (
            <span className="time-timer__duration-label">/ {duration} min</span>
          )}
        </div>
      </div>

      {/* Contrôles */}
      <div className="time-timer__controls">
        <button
          className="time-timer__btn time-timer__btn--primary skip-min-touch-target"
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
          className="time-timer__btn time-timer__btn--secondary skip-min-touch-target"
          onClick={resetTimer}
          aria-label={t('timeTimer.reset')}
        >
          <span className="time-timer__icon">↻</span>
          {!compact && <span>{t('timeTimer.reset')}</span>}
        </button>

        <button
          className="time-timer__btn time-timer__btn--secondary skip-min-touch-target"
          onClick={() => setShowSettings(!showSettings)}
          aria-label={t('timeTimer.settings')}
          aria-expanded={showSettings}
        >
          <span className="time-timer__icon">⚙</span>
          {!compact && <span>{t('timeTimer.settings')}</span>}
        </button>
      </div>

      {/* Modal de réglages */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
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
                      changeDuration(value) // Applique la durée au timer
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
                      changeDuration(value) // Applique la durée au timer
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
                checked={!isSilentMode}
                onChange={toggleSilentMode}
                className="time-timer__checkbox"
              />
              <span className="time-timer__checkbox-text">
                🔔{' '}
                {isSilentMode
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
                    diskColor === colorOption.id
                      ? 'time-timer__color-btn--selected'
                      : ''
                  }`}
                  onClick={() => changeDiskColor(colorOption.id)}
                  aria-pressed={diskColor === colorOption.id}
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
                duration !== 60 ? 'time-timer__checkbox-label--disabled' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={showNumbers}
                onChange={toggleShowNumbers}
                disabled={duration !== 60}
                className="time-timer__checkbox"
              />
              <span className="time-timer__checkbox-text">
                🔢{' '}
                {showNumbers
                  ? 'Masquer les chiffres horaires'
                  : 'Afficher les chiffres horaires'}
              </span>
            </label>
            {duration !== 60 && (
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
                  checked={enableVibration}
                  onChange={toggleVibration}
                  className="time-timer__checkbox"
                />
                <span className="time-timer__checkbox-text">
                  📳{' '}
                  {enableVibration
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
        {timeLeft === 0 && t('timeTimer.completed')}
        {timeLeft > 0 && isRunning && t('timeTimer.running')}
        {timeLeft > 0 && !isRunning && t('timeTimer.paused')}
      </div>
    </div>
  )
}
