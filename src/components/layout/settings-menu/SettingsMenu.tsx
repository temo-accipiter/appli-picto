'use client'

import { Checkbox } from '@/components'
import { FeatureGate } from '@/components/shared/feature-gate/FeatureGate'
import { useDisplay, useToast } from '@/contexts'
import { useI18n, useParametres } from '@/hooks'
import { Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import './SettingsMenu.scss'

export default function SettingsMenu() {
  const { t } = useI18n()
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
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

  // Fermer avec Escape
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        btnRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Fermer quand on clique en dehors
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setOpen(false)
  }

  return (
    <div className="settings-menu">
      <button
        ref={btnRef}
        className={`settings-menu__trigger${open ? ' settings-menu__trigger--active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('settings.title')}
        title={t('settings.title')}
      >
        <span className="settings-menu__burger" aria-hidden="true">
          <span className="settings-menu__burger-line" />
          <span className="settings-menu__burger-line" />
          <span className="settings-menu__burger-line" />
        </span>
      </button>

      {open && (
        <div
          className="settings-menu__backdrop"
          role="presentation"
          onMouseDown={handleBackdropMouseDown}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('settings.title')}
            className="settings-menu__dialog"
            onMouseDown={e => e.stopPropagation()}
          >
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
                  onChange={e =>
                    updateParametres({ confettis: e.target.checked })
                  }
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
          </div>
        </div>
      )}
    </div>
  )
}
