import { revokeConsent } from '@/utils/consent'
import { Link } from 'react-router-dom'
import './Footer.scss'

export default function Footer() {
  const handleRetractConsent = () => {
    // Retirer le consentement aux cookies
    if (revokeConsent()) {
      // Recharger la page pour appliquer les changements
      window.location.reload()
    }
  }

  return (
    <footer className="app-footer" role="contentinfo" aria-label="Pied de page">
      <nav className="app-footer__nav" aria-label="Liens légaux et RGPD">
        <ul className="app-footer__list">
          <li>
            <Link to="/mentions-legales">Mentions légales</Link>
          </li>
          <li>
            <Link to="/cgu">CGU</Link>
          </li>
          <li>
            <Link to="/cgv">CGV</Link>
          </li>
          <li>
            <Link to="/politique-confidentialite">Confidentialité</Link>
          </li>
          <li>
            <Link to="/politique-cookies">Politique de cookies</Link>
          </li>
          <li>
            <button
              type="button"
              className="linklike"
              aria-label="Ouvrir les préférences de cookies"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('open-cookie-preferences'))
              }
            >
              Préférences cookies
            </button>
          </li>
          <li>
            <button
              type="button"
              className="linklike"
              onClick={handleRetractConsent}
              aria-label="Retirer mon consentement aux cookies"
            >
              Retirer mon consentement
            </button>
          </li>
          <li>
            <Link to="/accessibilite">Accessibilité</Link>
          </li>
          <li>
            <Link to="/rgpd">Portail RGPD</Link>
          </li>
        </ul>
      </nav>
      <p className="app-footer__copy">
        © {new Date().getFullYear()}{' '}
        {{
          /*Votre marque*/
        }.toString
          ? ''
          : ''}
      </p>
    </footer>
  )
}

// PropTypes pour le composant Footer
Footer.propTypes = {
  // Aucune prop pour ce composant
}
