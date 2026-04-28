'use client'

import { useState, useEffect } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  supabase,
  validateEmail,
  validatePasswordStrength,
  normalizeEmail,
} from '@/utils'
import { useAuth, useI18n } from '@/hooks'
import { useToast } from '@/contexts'
import { Input, Button, Checkbox, PasswordChecklist } from '@/components'
import Turnstile from 'react-turnstile'
import i18n from '@/config/i18n/i18n'
import './Signup.scss'

export default function Signup() {
  const { user } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const { show: showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)
  const [cguAccepted, setCguAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    // Validation au clic (jamais de disabled sauf pour la CGU)
    const e1 = validateEmail(email)
    const e2 = validatePasswordStrength(password)
    const e3 = confirmPassword !== password ? t('auth.passwordsDontMatch') : ''

    setEmailError(e1)
    setPasswordError(e2)
    setConfirmError(e3)
    setConfirmTouched(true)

    if (e1 || e2 || e3) {
      if (e1) document.getElementById('signup-email')?.focus()
      else if (e2) document.getElementById('signup-password')?.focus()
      else document.getElementById('signup-confirm')?.focus()
      return
    }

    if (!captchaToken) {
      setSubmitError(t('errors.validationError'))
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        captchaToken,
        // Note : Le trigger DB crée automatiquement le profil enfant "Mon enfant"
      },
    })

    if (signUpError) {
      setSubmitError(
        /Password should|weak password/i.test(signUpError.message)
          ? t('auth.passwordTooShort')
          : signUpError.message
      )
      showToast(t('auth.error'), 'error')
    } else {
      // TODO(consent-tracking): brancher l'écriture dans consent_events
      // au moment de la création du compte. À traiter en commits 2-3 :
      //   commit 2 = migration DB + fonction RPC record_consent_event
      //   commit 3 = appel de la RPC ici, après signUp() réussi
      // Consent_type='cgu_acceptance', origin='signup_page'.
      setSuccess(true)
      showToast(t('auth.checkYourEmail'), 'info')
    }

    setLoading(false)
  }

  // Redirection si déjà connecté
  useEffect(() => {
    if (user) {
      router.push('/tableau')
    }
  }, [user, router])

  return (
    <div className="signup-page">
      {/* ── HEADER MARQUE ── */}
      <header className="signup-page__header">
        {/* Logo décoratif : aria-hidden car "Appli-Picto" est écrit en clair ci-dessous */}
        <div className="signup-page__logo" aria-hidden="true">
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="56" height="56" rx="12" fill="currentColor" />
            <rect x="11" y="11" width="14" height="14" rx="2" fill="white" />
            <rect x="31" y="11" width="14" height="14" rx="2" fill="white" />
            <rect x="11" y="31" width="14" height="14" rx="2" fill="white" />
            <rect x="31" y="31" width="14" height="14" rx="2" fill="white" />
          </svg>
        </div>
        <h1 className="signup-page__title">Appli-Picto</h1>
        <p className="signup-page__tagline">La journée en pictogrammes</p>
      </header>

      {/* ── CARTE FORMULAIRE ── */}
      <main className="signup-page__card">
        {/* État succès : confirmation email envoyé */}
        {success ? (
          <div
            className="signup-page__success"
            role="status"
            aria-live="polite"
          >
            <p>{t('auth.resetEmailSent')}</p>
            <p className="signup-page__success-hint">
              <Link href="/login" className="signup-page__success-link">
                {t('nav.login')}
              </Link>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSignup}
            noValidate
            aria-label="Formulaire d'inscription"
          >
            {/* Champ email */}
            <div className="signup-page__field">
              <Input
                id="signup-email"
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                autoComplete="email"
                inputMode="email"
                error={emailError}
                autoFocus
              />
            </div>

            {/* Champ mot de passe + checklist inline toujours visible */}
            <div className="signup-page__field">
              <Input
                id="signup-password"
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                autoComplete="new-password"
                error={passwordError}
              />
              {/* Checklist discrète, toujours visible, sans accordion */}
              <div className="signup-page__checklist">
                <PasswordChecklist password={password} />
              </div>
            </div>

            {/* Champ confirmation mot de passe */}
            <div className="signup-page__field">
              <Input
                id="signup-confirm"
                label={t('auth.confirmPassword')}
                type="password"
                value={confirmPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setConfirmPassword(e.target.value)
                  // Mise à jour live uniquement si le champ a déjà été touché
                  if (confirmTouched) {
                    setConfirmError(
                      e.target.value !== password
                        ? t('auth.passwordsDontMatch')
                        : ''
                    )
                  }
                }}
                onBlur={() => {
                  setConfirmTouched(true)
                  setConfirmError(
                    confirmPassword !== password
                      ? t('auth.passwordsDontMatch')
                      : ''
                  )
                }}
                autoComplete="new-password"
                error={confirmError}
              />
            </div>

            {/* Cloudflare Turnstile — intégration conservée à l'identique */}
            <div className="signup-page__captcha">
              <Turnstile
                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                onSuccess={token => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                theme="light"
                language={i18n.language}
              />
            </div>

            {/* Case CGU / Politique de confidentialité (RGPD art. 7) */}
            {/* Non pré-cochée par défaut — consentement explicite obligatoire */}
            <div className="signup-page__cgu">
              <Checkbox
                id="signup-cgu"
                checked={cguAccepted}
                onChange={e => setCguAccepted(e.target.checked)}
                aria-required="true"
                size="sm"
              />
              <label htmlFor="signup-cgu" className="signup-page__cgu-label">
                J&apos;accepte les{' '}
                <Link
                  href="/cgu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="signup-page__cgu-link"
                  aria-label="Conditions générales d'utilisation"
                >
                  CGU
                </Link>{' '}
                et la{' '}
                <Link
                  href="/politique-de-confidentialite"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="signup-page__cgu-link"
                >
                  Politique de confidentialité
                </Link>
              </label>
            </div>

            {/* Erreur globale (soumission) */}
            {submitError && (
              <div
                className="signup-page__error"
                role="alert"
                aria-live="polite"
              >
                <p>{submitError}</p>
              </div>
            )}

            {/* Bouton Créer un compte */}
            {/* EXCEPTION RGPD : disabled tant que CGU non cochée (seul cas légitime) */}
            <Button
              type="submit"
              label={t('nav.createAccount')}
              variant="primary"
              isLoading={loading}
              disabled={!cguAccepted}
              title={
                !cguAccepted
                  ? 'Veuillez accepter les CGU pour continuer'
                  : undefined
              }
              className="signup-page__submit"
            />
          </form>
        )}

        {/* Lien connexion — correction bug "Se connecter Se connecter" */}
        <p className="signup-page__login-prompt">
          <span className="signup-page__login-hint">Déjà un compte&nbsp;?</span>{' '}
          <Link href="/login" className="signup-page__login-link">
            {t('nav.login')}
          </Link>
        </p>
      </main>
    </div>
  )
}
