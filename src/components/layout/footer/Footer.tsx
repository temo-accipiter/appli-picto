'use client'

import { useI18n } from '@/hooks'
import { revokeConsent } from '@/utils/consent'
import Link from 'next/link'
import './Footer.scss'

export default function Footer() {
  const { t } = useI18n()

  const handleRetractConsent = () => {
    if (revokeConsent()) {
      window.location.reload()
    }
  }

  return (
    <footer className="app-footer" role="contentinfo">
      <nav className="app-footer__nav" aria-label="Liens légaux et cookies">
        <Link href="/legal/mentions-legales" className="app-footer__item">
          {t('legal.mentions')}
        </Link>
        <span className="app-footer__sep" aria-hidden="true">
          ·
        </span>
        <Link
          href="/legal/politique-confidentialite"
          className="app-footer__item"
        >
          Confidentialité
        </Link>
        <span className="app-footer__sep" aria-hidden="true">
          ·
        </span>
        <Link
          href="/legal/cgu"
          className="app-footer__item"
          aria-label="Conditions générales d'utilisation"
        >
          CGU
        </Link>
        <span className="app-footer__sep" aria-hidden="true">
          ·
        </span>
        <Link
          href="/legal/cgv"
          className="app-footer__item"
          aria-label="Conditions générales de vente"
        >
          CGV
        </Link>
        <span className="app-footer__sep" aria-hidden="true">
          ·
        </span>
        <Link href="/legal/accessibilite" className="app-footer__item">
          {t('legal.accessibility')}
        </Link>
        <span className="app-footer__sep" aria-hidden="true">
          ·
        </span>
        <Link href="/legal/rgpd" className="app-footer__item">
          Portail RGPD
        </Link>
        <span className="app-footer__sep" aria-hidden="true">
          ·
        </span>
        <Link href="/legal/politique-cookies" className="app-footer__item">
          Cookies
        </Link>
        <span className="app-footer__sep" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          className="app-footer__item app-footer__item--btn"
          onClick={handleRetractConsent}
          aria-label={t('cookies.refuse')}
        >
          Refuser
        </button>
        <span className="app-footer__sep" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          className="app-footer__item app-footer__item--btn"
          aria-label={t('cookies.customize')}
          onClick={() =>
            window.dispatchEvent(new CustomEvent('open-cookie-preferences'))
          }
        >
          Personnaliser
        </button>
      </nav>
    </footer>
  )
}
