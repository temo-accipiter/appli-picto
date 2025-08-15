import { Link } from 'react-router-dom'
import './Footer.scss'

export default function Footer() {
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
            <Link to="/politique-cookies">Cookies</Link>
          </li>
          <li>
            {/* Le module préférences sera branché ensuite */}
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
