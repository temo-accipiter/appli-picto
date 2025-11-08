import { useAuth, useI18n } from '@/hooks'
import { getConsent, saveConsent, tryLogServerConsent } from '@/utils/consent'
import { useEffect, useState } from 'react'
import './CookieBanner.scss'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const { user } = useAuth()
  const { t } = useI18n()

  useEffect(() => {
    const existing = getConsent()
    setVisible(!existing)
  }, [])

  const baseExtra = () => ({
    user_id: user?.id || null,
    ua: navigator.userAgent,
    locale: navigator.language || 'fr',
    app_version: '1.0.0',
  })

  const acceptAll = async () => {
    const payload = saveConsent(
      { analytics: true, marketing: true },
      'accept_all',
      baseExtra()
    )
    setVisible(false)
    await tryLogServerConsent({ ...payload, action: 'accept_all' })
  }

  const refuseAll = async () => {
    const payload = saveConsent(
      { analytics: false, marketing: false },
      'refuse_all',
      baseExtra()
    )
    setVisible(false)
    await tryLogServerConsent({ ...payload, action: 'refuse_all' })
  }

  const openPreferences = () => {
    window.dispatchEvent(new CustomEvent('cookie-preferences:open'))
  }

  if (!visible) return null

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-labelledby="cookie-banner-title"
    >
      <div className="cookie-banner__content">
        <div className="cookie-banner__text">
          <h2 id="cookie-banner-title" className="cookie-banner__title">
            {t('cookies.banner')}
          </h2>
          <p>{t('cookies.banner')}</p>
          <p>
            <a
              href="/politique-cookies"
              target="_blank"
              rel="noopener"
              className="cookie-banner__link"
            >
              {t('legal.cookies')}
            </a>
          </p>
        </div>
        <div
          className="cookie-banner__actions"
          role="group"
          aria-label={t('cookies.banner')}
        >
          <button
            className="btn btn-secondary"
            onClick={refuseAll}
            aria-describedby="cookie-banner-title"
          >
            {t('cookies.refuse')}
          </button>
          <button
            className="btn btn-outline"
            onClick={openPreferences}
            aria-describedby="cookie-banner-title"
          >
            {t('cookies.customize')}
          </button>
          <button
            className="btn"
            onClick={acceptAll}
            aria-describedby="cookie-banner-title"
          >
            {t('cookies.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
