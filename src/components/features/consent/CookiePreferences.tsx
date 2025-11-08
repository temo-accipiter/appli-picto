import { useAuth, useI18n } from '@/hooks'
import {
  defaultChoices,
  getConsent,
  saveConsent,
  tryLogServerConsent,
} from '@/utils/consent'
import { X } from 'lucide-react' // WCAG - Icône SVG au lieu de caractère
import { useEffect, useRef, useState } from 'react'
import './CookiePreferences.scss'

export default function CookiePreferences() {
  const [open, setOpen] = useState(false)
  const [choices, setChoices] = useState(defaultChoices())
  const { user } = useAuth()
  const { t } = useI18n()
  const closeButtonRef = useRef<HTMLButtonElement>(null) // WCAG 2.4.3 - Focus management
  const triggerElementRef = useRef<HTMLElement | null>(null) // WCAG 2.4.3 - Return focus

  useEffect(() => {
    const onOpen = () => {
      // Mémoriser l'élément qui a déclenché l'ouverture
      triggerElementRef.current = document.activeElement as HTMLElement
      setOpen(true)
    }
    window.addEventListener('cookie-preferences:open', onOpen)
    return () => window.removeEventListener('cookie-preferences:open', onOpen)
  }, [])

  useEffect(() => {
    const existing = getConsent()
    setChoices(existing?.choices || defaultChoices())
  }, [open])

  // WCAG 2.1.2 - Focus trap et gestion Escape
  useEffect(() => {
    if (!open) return

    // Auto-focus sur le bouton close
    const timeout = setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 100)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }

      // Focus trap avec Tab
      if (e.key === 'Tab') {
        const focusables = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.cookie-prefs__dialog button:not([disabled]), .cookie-prefs__dialog input:not([disabled]), .cookie-prefs__dialog a'
          )
        )

        const firstFocusable = focusables[0]
        const lastFocusable = focusables[focusables.length - 1]

        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const baseExtra = () => ({
    user_id: user?.id || null,
    ua: navigator.userAgent,
    locale: navigator.language || 'fr',
    app_version: '1.0.0',
  })

  const close = () => {
    setOpen(false)
    // WCAG 2.4.3 - Retourner le focus à l'élément déclencheur
    setTimeout(() => {
      triggerElementRef.current?.focus()
    }, 100)
  }
  const toggle = (key: string) =>
    setChoices(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))

  const acceptAll = async () => {
    const payload = saveConsent(
      { analytics: true, marketing: true },
      'accept_all',
      baseExtra()
    )
    await tryLogServerConsent({ ...payload, action: 'accept_all' })
    close()
  }

  const refuseAll = async () => {
    const payload = saveConsent(
      { analytics: false, marketing: false },
      'refuse_all',
      baseExtra()
    )
    await tryLogServerConsent({ ...payload, action: 'refuse_all' })
    close()
  }

  const save = async () => {
    const payload = saveConsent(choices, 'custom', baseExtra())
    await tryLogServerConsent({ ...payload, action: 'custom' })
    close()
  }

  if (!open) return null

  return (
    <div
      className="cookie-prefs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-prefs-title"
    >
      <div className="cookie-prefs__dialog" role="document">
        <header className="cookie-prefs__header">
          <h2 id="cookie-prefs-title">{t('cookies.preferencesTitle')}</h2>
          <button
            ref={closeButtonRef}
            className="icon"
            onClick={close}
            aria-label={t('cookies.close')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="cookie-prefs__body">
          <div className="cookie-prefs__intro">
            <p>{t('cookies.intro')}</p>
          </div>

          <fieldset className="cookie-prefs__fieldset">
            <legend className="cookie-prefs__legend">
              <span className="cookie-prefs__category cookie-prefs__category--necessary">
                {t('cookies.necessaryTitle')}
              </span>
            </legend>
            <div className="cookie-prefs__description">
              <p>{t('cookies.necessaryDescription')}</p>
              <ul>
                <li>{t('cookies.necessaryFeature1')}</li>
                <li>{t('cookies.necessaryFeature2')}</li>
                <li>{t('cookies.necessaryFeature3')}</li>
              </ul>
            </div>
            <div className="cookie-prefs__checkbox">
              <input
                type="checkbox"
                id="necessary-cookies"
                checked={true}
                disabled
              />
              <label htmlFor="necessary-cookies">
                {t('cookies.alwaysActive')}
              </label>
            </div>
          </fieldset>

          <fieldset className="cookie-prefs__fieldset">
            <legend className="cookie-prefs__legend">
              <span className="cookie-prefs__category cookie-prefs__category--analytics">
                {t('cookies.analyticsTitle')}
              </span>
            </legend>
            <div className="cookie-prefs__description">
              <p>{t('cookies.analyticsDescription')}</p>
              <ul>
                <li>{t('cookies.analyticsFeature1')}</li>
                <li>{t('cookies.analyticsFeature2')}</li>
                <li>{t('cookies.analyticsFeature3')}</li>
                <li>{t('cookies.analyticsFeature4')}</li>
              </ul>
            </div>
            <div className="cookie-prefs__checkbox">
              <input
                type="checkbox"
                id="analytics-cookies"
                checked={!!choices.analytics}
                onChange={() => toggle('analytics')}
              />
              <label htmlFor="analytics-cookies">
                {t('cookies.enableAnalytics')}
              </label>
            </div>
          </fieldset>

          <fieldset className="cookie-prefs__fieldset">
            <legend className="cookie-prefs__legend">
              <span className="cookie-prefs__category cookie-prefs__category--marketing">
                {t('cookies.marketingTitle')}
              </span>
            </legend>
            <div className="cookie-prefs__description">
              <p>{t('cookies.marketingDescription')}</p>
              <ul>
                <li>{t('cookies.marketingFeature1')}</li>
                <li>{t('cookies.marketingFeature2')}</li>
                <li>{t('cookies.marketingFeature3')}</li>
              </ul>
            </div>
            <div className="cookie-prefs__checkbox">
              <input
                type="checkbox"
                id="marketing-cookies"
                checked={!!choices.marketing}
                onChange={() => toggle('marketing')}
              />
              <label htmlFor="marketing-cookies">
                {t('cookies.enableMarketing')}
              </label>
            </div>
          </fieldset>

          <div className="cookie-prefs__info">
            <p>
              <strong>{t('cookies.infoRetentionLabel')}</strong>{' '}
              {t('cookies.infoRetention')}
            </p>
            <p>
              <strong>{t('cookies.infoMoreLabel')}</strong>{' '}
              <a href="/politique-cookies" target="_blank" rel="noopener">
                {t('cookies.infoMoreLink')}
              </a>
            </p>
          </div>
        </div>

        <footer className="cookie-prefs__footer">
          <div className="cookie-prefs__actions">
            <button
              className="btn btn-secondary"
              onClick={refuseAll}
              aria-describedby="cookie-prefs-title"
            >
              {t('cookies.refuseAll')}
            </button>
            <button
              className="btn btn-outline"
              onClick={save}
              aria-describedby="cookie-prefs-title"
            >
              {t('cookies.saveMyChoices')}
            </button>
            <button
              className="btn"
              onClick={acceptAll}
              aria-describedby="cookie-prefs-title"
            >
              {t('cookies.acceptAll')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
