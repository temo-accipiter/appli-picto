'use client'

import { Checkbox, Modal } from '@/components'
import { useAuth, useI18n } from '@/hooks'
import {
  defaultChoices,
  getConsent,
  saveConsent,
  tryLogServerConsent,
} from '@/utils/consent'
import { useEffect, useRef, useState } from 'react'
import './CookiePreferences.scss'

export default function CookiePreferences() {
  const [open, setOpen] = useState(false)
  const [choices, setChoices] = useState(defaultChoices())
  const { user } = useAuth()
  const { t } = useI18n()
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

  const baseExtra = () => ({
    user_id: user?.id || null,
    ua: navigator.userAgent,
    locale: navigator.language || 'fr',
    app_version: '1.0.0',
    origin: typeof window !== 'undefined' ? window.location.hostname : null,
    ts_client: new Date().toISOString(),
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
    await tryLogServerConsent({
      ...payload,
      mode: 'accept_all',
      action: 'update',
    })
    close()
  }

  const refuseAll = async () => {
    const payload = saveConsent(
      { analytics: false, marketing: false },
      'refuse_all',
      baseExtra()
    )
    await tryLogServerConsent({
      ...payload,
      mode: 'refuse_all',
      action: 'update',
    })
    close()
  }

  const save = async () => {
    const payload = saveConsent(choices, 'custom', baseExtra())
    await tryLogServerConsent({
      ...payload,
      mode: 'custom',
      action: 'update',
    })
    close()
  }

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title={t('cookies.preferencesTitle')}
      closeOnOverlay={false}
      size="large"
      actions={[
        {
          label: t('cookies.refuseAll'),
          onClick: refuseAll,
          variant: 'secondary',
        },
        {
          label: t('cookies.saveMyChoices'),
          onClick: save,
          variant: 'default',
        },
        {
          label: t('cookies.acceptAll'),
          onClick: acceptAll,
          variant: 'primary',
        },
      ]}
    >
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
            <Checkbox
              id="necessary-cookies"
              label={t('cookies.alwaysActive')}
              checked={true}
              onChange={() => {}}
              disabled
            />
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
            <Checkbox
              id="analytics-cookies"
              label={t('cookies.enableAnalytics')}
              checked={!!choices.analytics}
              onChange={() => toggle('analytics')}
            />
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
            <Checkbox
              id="marketing-cookies"
              label={t('cookies.enableMarketing')}
              checked={!!choices.marketing}
              onChange={() => toggle('marketing')}
            />
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
    </Modal>
  )
}
