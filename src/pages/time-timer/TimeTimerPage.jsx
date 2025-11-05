// src/pages/time-timer/TimeTimerPage.jsx
import { TimeTimer } from '@/components'
import { useI18n } from '@/hooks'
import { useCallback } from 'react'
import { useToast } from '@/contexts'
import './TimeTimerPage.scss'

/**
 * Page dédiée au Time Timer
 * Affiche le composant TimeTimer en plein écran
 */
export default function TimeTimerPage() {
  const { t } = useI18n()
  const { showToast } = useToast()

  const handleTimerComplete = useCallback(() => {
    showToast(t('timeTimer.completed'), 'success')
  }, [t, showToast])

  return (
    <div className="time-timer-page">
      <header className="time-timer-page__header">
        <h1 className="time-timer-page__title">{t('timeTimer.title')}</h1>
        <p className="time-timer-page__subtitle">
          Un outil visuel pour gérer le temps
        </p>
      </header>

      <main className="time-timer-page__content">
        <TimeTimer
          compact={false}
          initialDuration={10}
          onComplete={handleTimerComplete}
        />
      </main>
    </div>
  )
}
