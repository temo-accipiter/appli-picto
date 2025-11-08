import { useAuth, useI18n } from '@/hooks'
import {
  defaultChoices,
  getConsent,
  saveConsent,
  tryLogServerConsent,
} from '@/utils/consent'
import { useEffect, useState } from 'react'
import './CookiePreferences.scss'

export default function CookiePreferences() {
  const [open, setOpen] = useState(false)
  const [choices, setChoices] = useState(defaultChoices())
  const { user } = useAuth()
  const { t } = useI18n()

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('cookie-preferences:open', onOpen)
    return () => window.removeEventListener('cookie-preferences:open', onOpen)
  }, [])

  useEffect(() => {
    const existing = getConsent()
    setChoices(existing?.choices || defaultChoices())
  }, [open])

  const baseExtra = () => ({
    user_id: user?.id || null,
    ua: navigator.userAgent,
    locale: navigator.language || 'fr',
    app_version: '1.0.0',
  })

  const close = () => setOpen(false)
  const toggle = (key: string) => setChoices(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))

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
            className="icon"
            onClick={close}
            aria-label={t('cookies.close')}
          >
            ✕
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
