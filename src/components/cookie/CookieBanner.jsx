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
    setVisible(!existing) // affiche si aucun choix encore enregistré
  }, [])

  const baseExtra = () => ({
    user_id: user?.id || null,
    ua: navigator.userAgent,
  })

  const acceptAll = async () => {
    const payload = saveConsent(
      { analytics: true, marketing: true },
      'accept_all',
      baseExtra()
    )
    setVisible(false)
    await tryLogServerConsent(supabase, { ...payload, action: 'accept_all' })
  }

  const refuseAll = async () => {
    const payload = saveConsent(
      { analytics: false, marketing: false },
      'refuse_all',
      baseExtra()
    )
    setVisible(false)
    await tryLogServerConsent(supabase, { ...payload, action: 'refuse_all' })
  }

  const openPreferences = () => {
    window.dispatchEvent(new CustomEvent('open-cookie-preferences'))
  }

  if (!visible) return null

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Bannière cookies"
    >
      <div className="cookie-banner__text">
        <strong>Cookies</strong> : nous utilisons des cookies pour faire
        fonctionner le site et, avec votre accord, mesurer l’audience et
        personnaliser.
      </div>
      <div
        className="cookie-banner__actions"
        role="group"
        aria-label="Choix de consentement"
      >
        <button className="btn btn-secondary" onClick={refuseAll}>
          Refuser
        </button>
        <button className="btn btn-outline" onClick={openPreferences}>
          Paramétrer
        </button>
        <button className="btn" onClick={acceptAll}>
          Accepter
        </button>
      </div>
    </div>
  )
}
