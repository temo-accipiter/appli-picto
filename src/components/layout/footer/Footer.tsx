import { useI18n } from '@/hooks'
import { revokeConsent } from '@/utils/consent'
import { Link } from 'react-router-dom'
import './Footer.scss'

export default function Footer() {
  const { t } = useI18n()

  const handleRetractConsent = () => {
    // Retirer le consentement aux cookies
    if (revokeConsent()) {
      // Recharger la page pour appliquer les changements
      window.location.reload()
    }
  }

  return (
    <footer
      className="app-footer"
      role="contentinfo"
      aria-label={t('legal.mentions')}
    >
      <nav className="app-footer__nav" aria-label={t('legal.mentions')}>
        <ul className="app-footer__list">
          <li>
            <Link to="/mentions-legales">{t('legal.mentions')}</Link>
          </li>
          <li>
            <Link to="/cgu">{t('legal.cgu')}</Link>
          </li>
          <li>
            <Link to="/cgv">{t('legal.cgv')}</Link>
          </li>
          <li>
            <Link to="/politique-confidentialite">{t('legal.privacy')}</Link>
          </li>
          <li>
            <Link to="/politique-cookies">{t('legal.cookies')}</Link>
          </li>
          <li>
            <button
              type="button"
              className="linklike"
              aria-label={t('cookies.customize')}
              onClick={() =>
                window.dispatchEvent(new CustomEvent('open-cookie-preferences'))
              }
            >
              {t('cookies.customize')}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="linklike"
              onClick={handleRetractConsent}
              aria-label={t('cookies.refuse')}
            >
              {t('cookies.refuse')}
            </button>
          </li>
          <li>
            <Link to="/accessibilite">{t('legal.accessibility')}</Link>
          </li>
          <li>
            <Link to="/rgpd">{t('legal.rgpd')}</Link>
          </li>
        </ul>
      </nav>
      <p className="app-footer__copy">© {new Date().getFullYear()}</p>
    </footer>
  )
}
