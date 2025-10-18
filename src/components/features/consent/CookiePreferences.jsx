import { useAuth } from '@/hooks'
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
  const toggle = key => setChoices(prev => ({ ...prev, [key]: !prev[key] }))

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
          <h2 id="cookie-prefs-title">Préférences de cookies et traceurs</h2>
          <button
            className="icon"
            onClick={close}
            aria-label="Fermer les préférences de cookies"
          >
            ✕
          </button>
        </header>

        <div className="cookie-prefs__body">
          <div className="cookie-prefs__intro">
            <p>
              Vous pouvez gérer vos préférences pour chaque catégorie de cookies
              et traceurs. Seuls les cookies strictement nécessaires sont
              activés par défaut.
            </p>
          </div>

          <fieldset className="cookie-prefs__fieldset">
            <legend className="cookie-prefs__legend">
              <span className="cookie-prefs__category cookie-prefs__category--necessary">
                Cookies strictement nécessaires
              </span>
            </legend>
            <div className="cookie-prefs__description">
              <p>
                Ces cookies sont essentiels au bon fonctionnement du site et ne
                peuvent pas être désactivés. Ils ne collectent aucune
                information personnelle.
              </p>
              <ul>
                <li>Authentification et sécurité</li>
                <li>Préférences utilisateur</li>
                <li>Fonctionnalités de base</li>
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
                Toujours actifs (obligatoires)
              </label>
            </div>
          </fieldset>

          <fieldset className="cookie-prefs__fieldset">
            <legend className="cookie-prefs__legend">
              <span className="cookie-prefs__category cookie-prefs__category--analytics">
                Mesure d&apos;audience et statistiques
              </span>
            </legend>
            <div className="cookie-prefs__description">
              <p>
                Ces cookies nous permettent de mesurer le nombre de visiteurs et
                d&apos;analyser l&apos;utilisation du site pour
                l&apos;améliorer. Ils ne collectent pas d&apos;informations
                personnelles identifiables.
              </p>
              <ul>
                <li>Nombre de pages vues</li>
                <li>Temps passé sur le site</li>
                <li>Origine du trafic</li>
                <li>Performance des pages</li>
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
                Activer la mesure d&apos;audience
              </label>
            </div>
          </fieldset>

          <fieldset className="cookie-prefs__fieldset">
            <legend className="cookie-prefs__legend">
              <span className="cookie-prefs__category cookie-prefs__category--marketing">
                Marketing et personnalisation
              </span>
            </legend>
            <div className="cookie-prefs__description">
              <p>
                Ces cookies permettent de vous proposer des contenus et
                publicités personnalisés selon vos centres d&apos;intérêt et
                votre utilisation du site.
              </p>
              <ul>
                <li>Publicités ciblées</li>
                <li>Recommandations personnalisées</li>
                <li>Suivi des campagnes publicitaires</li>
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
                Activer le marketing et la personnalisation
              </label>
            </div>
          </fieldset>

          <div className="cookie-prefs__info">
            <p>
              <strong>Durée de conservation :</strong> Vos choix sont conservés
              6 mois. Vous pourrez les modifier à tout moment via le lien en
              pied de page.
            </p>
            <p>
              <strong>Plus d&apos;informations :</strong>{' '}
              <a href="/politique-cookies" target="_blank" rel="noopener">
                Consultez notre politique de cookies complète
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
              Tout refuser
            </button>
            <button
              className="btn btn-outline"
              onClick={save}
              aria-describedby="cookie-prefs-title"
            >
              Enregistrer mes choix
            </button>
            <button
              className="btn"
              onClick={acceptAll}
              aria-describedby="cookie-prefs-title"
            >
              Tout accepter
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

// PropTypes pour le composant CookiePreferences
CookiePreferences.propTypes = {
  // Aucune prop pour ce composant
}
