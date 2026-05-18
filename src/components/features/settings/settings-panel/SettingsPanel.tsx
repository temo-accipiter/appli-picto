'use client'

import { useI18n, useAccountPreferences, useIsVisitor } from '@/hooks'
import { useToast } from '@/contexts'
import { Toggle, TrainThemeSelector } from '@/components'

import './SettingsPanel.scss'

type ToggleKey = 'confetti_enabled' | 'toasts_enabled' | 'time_timer_enabled'

/**
 * Panneau Paramètres de la page Édition.
 *
 * Regroupe les réglages d'affichage du Tableau enfant :
 *  - 3 toggles simples (confettis, notifications, Time Timer) écrivant
 *    en DB via useAccountPreferences ;
 *  - le bloc riche TrainThemeSelector (activation + thème du train).
 *
 * Lecture seule pour le Visitor (= Demo en V1) : toggles désactivés.
 */
export default function SettingsPanel() {
  const { t } = useI18n()
  const { preferences, updatePreferences } = useAccountPreferences()
  const { isVisitor } = useIsVisitor()
  const { show } = useToast()

  const isReadOnly = isVisitor

  const handleToggle = async (key: ToggleKey, next: boolean) => {
    if (isReadOnly) return
    const result = await updatePreferences({ [key]: next })
    if (!result.ok) show(t('errors.generic'), 'error')
  }

  // Défauts alignés sur les colonnes DB (toutes NOT NULL DEFAULT true).
  const confettiEnabled = preferences?.confetti_enabled ?? true
  const toastsEnabled = preferences?.toasts_enabled ?? true
  const timeTimerEnabled = preferences?.time_timer_enabled ?? true

  return (
    <section className="settings-panel" aria-labelledby="settings-panel-title">
      <h2 id="settings-panel-title" className="settings-panel__title">
        {t('settings.title')}
      </h2>

      <div className="settings-panel__toggles">
        <div className="settings-panel__row">
          <Toggle
            id="setting-confetti"
            checked={confettiEnabled}
            onChange={next => handleToggle('confetti_enabled', next)}
            disabled={isReadOnly}
            aria-label={t('edition.confetti')}
          />
          <span className="settings-panel__label">{t('edition.confetti')}</span>
        </div>

        <div className="settings-panel__row">
          <Toggle
            id="setting-toasts"
            checked={toastsEnabled}
            onChange={next => handleToggle('toasts_enabled', next)}
            disabled={isReadOnly}
            aria-label={t('edition.notifications')}
          />
          <span className="settings-panel__label">
            {t('edition.notifications')}
          </span>
        </div>

        <div className="settings-panel__row">
          <Toggle
            id="setting-time-timer"
            checked={timeTimerEnabled}
            onChange={next => handleToggle('time_timer_enabled', next)}
            disabled={isReadOnly}
            aria-label={t('edition.timer')}
          />
          <span className="settings-panel__label">{t('edition.timer')}</span>
        </div>
      </div>

      <TrainThemeSelector />
    </section>
  )
}
