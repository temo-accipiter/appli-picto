import { useAuth, useI18n } from '@/hooks'
import { getConsent, saveConsent, tryLogServerConsent } from '@/utils/consent'
import { useEffect, useRef, useState } from 'react'
import './CookieBanner.scss'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const { user } = useAuth()
  const { t } = useI18n()
  const firstButtonRef = useRef<HTMLButtonElement>(null) // WCAG 2.4.3 - Focus management
  const focusableElementsRef = useRef<HTMLElement[]>([]) // WCAG 2.1.2 - Focus trap

  useEffect(() => {
    const existing = getConsent()
    setVisible(!existing)
  }, [])

  // WCAG 2.1.2 - Focus trap et gestion Escape
  useEffect(() => {
    if (!visible) return

    // Auto-focus sur le premier bouton
    const timeout = setTimeout(() => {
      firstButtonRef.current?.focus()
    }, 100)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        // Sur Escape, refuser tous les cookies (comportement par défaut sécurisé)
        refuseAll()
      }

      // Focus trap avec Tab
      if (e.key === 'Tab') {
        const focusables = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.cookie-banner button, .cookie-banner a'
          )
        ).filter(el => !el.hasAttribute('disabled'))

        focusableElementsRef.current = focusables

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

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
      aria-modal="true"
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
            ref={firstButtonRef}
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
