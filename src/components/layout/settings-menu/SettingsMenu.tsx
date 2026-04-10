'use client'

import { Button, Checkbox, Dropdown } from '@/components'
import { useDisplay, useToast } from '@/contexts'
import { useI18n, useAccountPreferences } from '@/hooks'
import { Settings } from 'lucide-react'
import { useRef, useState } from 'react'

import './SettingsMenu.scss'

export default function SettingsMenu() {
  const { t } = useI18n()
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const { preferences, updatePreferences } = useAccountPreferences()
  const { showTrain, setShowTrain, showTimeTimer, setShowTimeTimer } =
    useDisplay()

  const triggerButton = (
    <Button
      ref={btnRef}
      variant="default"
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
    </Button>
  )

  const dropdownContent = (
    <>
      <header className="settings-menu__header">
        <Settings size={18} aria-hidden="true" />
        <span>{t('settings.title')}</span>
      </header>

      <div className="settings-menu__content">
        {preferences && (
          <Checkbox
            id="settings-confettis"
            label={t('edition.confetti')}
            checked={!!preferences.confetti_enabled}
            onChange={async e => {
              const result = await updatePreferences({
                confetti_enabled: e.target.checked,
              })
              if (!result.ok) {
                show(t('errors.generic'), 'error')
              }
            }}
          />
        )}

        <Checkbox
          id="settings-train"
          label={t('edition.train')}
          checked={showTrain}
          onChange={e => setShowTrain(e.target.checked)}
        />

        <Checkbox
          id="settings-timer"
          label={t('edition.timer')}
          checked={showTimeTimer}
          onChange={e => setShowTimeTimer(e.target.checked)}
        />

        {preferences && (
          <Checkbox
            id="settings-toasts"
            label={t('edition.notifications')}
            checked={preferences.toasts_enabled ?? true}
            onChange={async e => {
              const result = await updatePreferences({
                toasts_enabled: e.target.checked,
              })
              if (!result.ok) {
                show(t('errors.generic'), 'error')
              }
            }}
          />
        )}

        <div className="settings-menu__divider" />

        <Button
          variant="default"
          className="settings-menu__link"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('cookie-preferences:open'))
            setOpen(false)
          }}
        >
          🍪 {t('settings.cookiePreferences')}
        </Button>
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
