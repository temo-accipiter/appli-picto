import { useEffect, useState } from 'react'
import './CookiePreferences.scss'
import {
  defaultChoices,
  getConsent,
  saveConsent,
  tryLogServerConsent,
} from '@/utils/consent'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'

export default function CookiePreferences() {
  const [open, setOpen] = useState(false)
  const [choices, setChoices] = useState(defaultChoices())
  const { user } = useAuth()

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('open-cookie-preferences', onOpen)
    return () => window.removeEventListener('open-cookie-preferences', onOpen)
  }, [])

  useEffect(() => {
    const existing = getConsent()
    setChoices(existing?.choices || defaultChoices())
  }, [open])

  const baseExtra = () => ({
    user_id: user?.id || null,
    ua: navigator.userAgent,
  })

  const close = () => setOpen(false)
  const toggle = key => setChoices(prev => ({ ...prev, [key]: !prev[key] }))

  const acceptAll = async () => {
    const payload = saveConsent(
      { analytics: true, marketing: true },
      'accept_all',
      baseExtra()
    )
    await tryLogServerConsent(supabase, { ...payload, action: 'accept_all' })
    close()
  }

  const refuseAll = async () => {
    const payload = saveConsent(
      { analytics: false, marketing: false },
      'refuse_all',
      baseExtra()
    )
    await tryLogServerConsent(supabase, { ...payload, action: 'refuse_all' })
    close()
  }

  const save = async () => {
    const payload = saveConsent(choices, 'custom', baseExtra())
    await tryLogServerConsent(supabase, { ...payload, action: 'custom' })
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
          <h2 id="cookie-prefs-title">Préférences cookies</h2>
          <button className="icon" onClick={close} aria-label="Fermer">
            ✕
          </button>
        </header>

        <div className="cookie-prefs__body">
          <fieldset className="cookie-group">
            <legend>Essentiels (toujours actifs)</legend>
            <p>
              Indispensables au fonctionnement du site (sécurité, session,
              panier…)
            </p>
            <label className="switch disabled">
              <input type="checkbox" checked readOnly aria-disabled="true" />
              <span>Activés</span>
            </label>
          </fieldset>

          <fieldset className="cookie-group">
            <legend>Mesure d’audience</legend>
            <p>
              Nous aide à comprendre l’utilisation (statistiques anonymisées si
              possible).
            </p>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!choices.analytics}
                onChange={() => toggle('analytics')}
                aria-label="Activer les cookies de mesure d’audience"
              />
              <span>{choices.analytics ? 'Activés' : 'Désactivés'}</span>
            </label>
          </fieldset>

          <fieldset className="cookie-group">
            <legend>Marketing</legend>
            <p>Personnalisation et publicités (si activées).</p>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!choices.marketing}
                onChange={() => toggle('marketing')}
                aria-label="Activer les cookies marketing"
              />
              <span>{choices.marketing ? 'Activés' : 'Désactivés'}</span>
            </label>
          </fieldset>
        </div>

        <footer className="cookie-prefs__footer">
          <button className="btn btn-secondary" onClick={refuseAll}>
            Tout refuser
          </button>
          <button className="btn btn-outline" onClick={save}>
            Enregistrer
          </button>
          <button className="btn" onClick={acceptAll}>
            Tout accepter
          </button>
        </footer>
      </div>
    </div>
  )
}
