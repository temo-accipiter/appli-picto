'use client'

import { Checkbox, Dropdown } from '@/components'
import { FeatureGate } from '@/components/shared/feature-gate/FeatureGate'
import { useDisplay, useToast } from '@/contexts'
import { useI18n, useParametres } from '@/hooks'
import { Settings } from 'lucide-react'
import { useRef, useState } from 'react'

import './SettingsMenu.scss'

export default function SettingsMenu() {
  const { t } = useI18n()
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const { parametres, updateParametres } = useParametres()
  const {
    showTrain,
    setShowTrain,
    showRecompense,
    setShowRecompense,
    showTimeTimer,
    setShowTimeTimer,
  } = useDisplay()

  const triggerButton = (
    <button
      ref={btnRef}
      className={`settings-menu__trigger${open ? ' settings-menu__trigger--active' : ''}`}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={t('settings.title')}
      title={t('settings.title')}
    >
      <span className="settings-menu__burger" aria-hidden="true">
        <span className="settings-menu__burger-line" />
        <span className="settings-menu__burger-line" />
        <span className="settings-menu__burger-line" />
      </span>
    </button>
  )

  const dropdownContent = (
    <>
      <header className="settings-menu__header">
        <Settings size={18} aria-hidden="true" />
        <span>{t('settings.title')}</span>
      </header>

      <div className="settings-menu__content">
        {parametres && (
          <Checkbox
            id="settings-confettis"
            label={t('edition.confetti')}
            checked={!!parametres.confettis}
            onChange={e => updateParametres({ confettis: e.target.checked })}
          />
        )}

        <FeatureGate feature="trainprogressbar">
          <Checkbox
            id="settings-train"
            label={t('edition.train')}
            checked={showTrain}
            onChange={e => setShowTrain(e.target.checked)}
          />
        </FeatureGate>

        <Checkbox
          id="settings-recompense"
          label={t('edition.reward')}
          checked={showRecompense}
          onChange={e => setShowRecompense(e.target.checked)}
        />

        <Checkbox
          id="settings-timer"
          label={t('edition.timer')}
          checked={showTimeTimer}
          onChange={e => setShowTimeTimer(e.target.checked)}
        />

        {parametres && (
          <Checkbox
            id="settings-toasts"
            label={t('edition.notifications')}
            checked={parametres.toasts_enabled ?? true}
            onChange={async e => {
              const result = await updateParametres({
                toasts_enabled: e.target.checked,
              })
              if (!result.ok) {
                show(t('errors.generic'), 'error')
              }
            }}
          />
        )}
      </div>
    </>
  )

  return (
    <Dropdown
      isOpen={open}
      onClose={() => setOpen(false)}
      trigger={triggerButton}
      className="settings-menu__dropdown"
      position="right"
    >
      {dropdownContent}
    </Dropdown>
  )
}
