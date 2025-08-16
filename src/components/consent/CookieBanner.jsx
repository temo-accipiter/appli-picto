import { useEffect, useState } from 'react'
import './CookieBanner.scss'
import {
  getConsent,
  saveConsent,
  defaultChoices,
  tryLogServerConsent,
} from '@/utils/consent'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const { user } = useAuth()

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
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-labelledby="cookie-banner-title">
      <div className="cookie-banner__content">
        <div className="cookie-banner__text">
          <h2 id="cookie-banner-title" className="cookie-banner__title">
            Gestion des cookies et traceurs
          </h2>
          <p>
            Nous utilisons des <strong>cookies et traceurs</strong> pour assurer le bon fonctionnement du site et, 
            <strong>avec votre consentement</strong>, pour mesurer l'audience et vous proposer des contenus personnalisés.
          </p>
          <p>
            Vous pouvez <strong>accepter</strong>, <strong>refuser</strong> ou <strong>paramétrer</strong> 
            vos choix à tout moment. Pour en savoir plus, consultez notre{' '}
            <a href="/politique-cookies" target="_blank" rel="noopener" className="cookie-banner__link">
              politique de cookies
            </a>.
          </p>
        </div>
        <div className="cookie-banner__actions" role="group" aria-label="Actions de gestion des cookies">
          <button 
            className="btn btn-secondary" 
            onClick={refuseAll}
            aria-describedby="cookie-banner-title"
          >
            Refuser
          </button>
          <button 
            className="btn btn-outline" 
            onClick={openPreferences}
            aria-describedby="cookie-banner-title"
          >
            Paramétrer
          </button>
          <button 
            className="btn" 
            onClick={acceptAll}
            aria-describedby="cookie-banner-title"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
