'use client'

import { useState, useEffect } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/utils/supabaseClient'
import { useAuth, useI18n } from '@/hooks'
import { useToast } from '@/contexts'
import { Input, Button } from '@/components'
import {
  validateEmail,
  validatePasswordNotEmpty,
  normalizeEmail,
} from '@/utils'
import Turnstile from 'react-turnstile'
import i18n from '@/config/i18n/i18n'
import googleIcon from '@/assets/images/google-icon.png'
import './Login.scss'

export default function Login() {
  const { user } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const { show: showToast } = useToast()
  const pathname = usePathname()

  const [emailValue, setEmailValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setEmailNotConfirmed(false)

    // Validation au clic (jamais de disabled sur le bouton en idle)
    const err1 = validateEmail(emailValue)
    const err2 = validatePasswordNotEmpty(passwordValue)
    setEmailError(err1)
    setPasswordError(err2)

    if (err1 || err2) {
      // Focus auto sur le premier champ invalide
      if (err1) {
        document.getElementById('login-email')?.focus()
      } else {
        document.getElementById('login-password')?.focus()
      }
      return
    }

    if (!captchaToken) {
      setSubmitError('Veuillez valider le CAPTCHA avant de continuer')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(emailValue),
      password: passwordValue,
      options: { captchaToken },
    })

    if (error) {
      console.warn('Erreur login :', error.message)
      const isEmailNotConfirmed =
        error.code === 'email_not_confirmed' ||
        error.message?.toLowerCase().includes('email not confirmed')

      if (isEmailNotConfirmed) {
        setEmailNotConfirmed(true)
        setSubmitError(
          'Votre adresse email n\u2019est pas encore confirmée. Vérifiez votre boîte mail.'
        )
      } else if (
        error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('fetch')
      ) {
        setSubmitError('Une erreur est survenue, veuillez réessayer')
      } else {
        // Message générique anti-énumération (ne révèle pas si l'email existe)
        setSubmitError('Identifiants incorrects')
        showToast('Identifiants incorrects', 'error')
      }
    } else {
      showToast(t('auth.loginSuccess'), 'success')
      router.push('/tableau')
    }

    setLoading(false)
  }

  const handleResendConfirmation = async () => {
    await supabase.auth.resend({
      type: 'signup',
      email: normalizeEmail(emailValue),
    })
    showToast('Email de confirmation renvoyé', 'success')
  }

  // TODO(oauth-google): implémenter le flow OAuth dans un commit séparé
  const handleGoogleLogin = () => {
    console.info('TODO: Google OAuth not implemented')
    showToast('Connexion Google bientôt disponible', 'info')
  }

  // Redirection si déjà connecté
  useEffect(() => {
    if (user && pathname !== '/reset-password') {
      router.push('/tableau')
    }
  }, [user, pathname, router])

  return (
    <div className="login-page">
      {/* ── HEADER MARQUE ── */}
      <header className="login-page__header">
        {/* Logo décoratif : aria-hidden car "Appli-Picto" est écrit en clair ci-dessous */}
        <div className="login-page__logo" aria-hidden="true">
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
        <h1 className="login-page__title">Appli-Picto</h1>
        <p className="login-page__tagline">La journée en pictogrammes</p>
      </header>

      {/* ── CARTE FORMULAIRE ── */}
      <main className="login-page__card">
        <form
          onSubmit={handleLogin}
          noValidate
          aria-label="Formulaire de connexion"
        >
          {/* Champ email */}
          <div className="login-page__field">
            <Input
              id="login-email"
              label={t('auth.email')}
              type="email"
              value={emailValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setEmailValue(e.target.value)
                if (emailError) setEmailError('')
              }}
              autoComplete="email"
              inputMode="email"
              error={emailError}
              autoFocus
            />
          </div>

          {/* Champ mot de passe + lien oublié */}
          <div className="login-page__field">
            <Input
              id="login-password"
              label={t('auth.password')}
              type="password"
              value={passwordValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setPasswordValue(e.target.value)
                if (passwordError) setPasswordError('')
              }}
              autoComplete="current-password"
              error={passwordError}
            />
            <div className="login-page__forgot">
              <Link href="/forgot-password" className="login-page__forgot-link">
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </div>

          {/* Cloudflare Turnstile — intégration conservée à l'identique */}
          <div className="login-page__captcha">
            <Turnstile
              sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
              onSuccess={token => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              theme="light"
              language={i18n.language}
            />
          </div>

          {/* Erreur globale (soumission) */}
          {submitError && (
            <div className="login-page__error" role="alert" aria-live="polite">
              <p>{submitError}</p>
              {emailNotConfirmed && (
                <button
                  type="button"
                  className="login-page__resend-btn"
                  onClick={handleResendConfirmation}
                >
                  Renvoyer l&apos;email de confirmation
                </button>
              )}
            </div>
          )}

          {/* Bouton Se connecter — TOUJOURS saturé en idle, jamais disabled sauf loading */}
          <Button
            type="submit"
            label={t('nav.login')}
            variant="primary"
            isLoading={loading}
            className="login-page__submit"
          />
        </form>

        {/* Séparateur "ou" */}
        <div className="login-page__separator" aria-hidden="true">
          <span className="login-page__separator-line" />
          <span className="login-page__separator-text">ou</span>
          <span className="login-page__separator-line" />
        </div>

        {/* Bouton Google — placeholder visuel uniquement */}
        {/* TODO(oauth-google): implémenter le flow OAuth dans un commit séparé */}
        <Button
          type="button"
          variant="default"
          className="login-page__google-btn"
          onClick={handleGoogleLogin}
          aria-label="Continuer avec Google (bientôt disponible)"
        >
          <Image
            src={googleIcon}
            alt=""
            width={20}
            height={20}
            aria-hidden="true"
          />
          <span>Continuer avec Google</span>
        </Button>

        {/* Lien inscription */}
        <p className="login-page__signup-prompt">
          <span className="login-page__signup-hint">
            Pas encore de compte&nbsp;?
          </span>{' '}
          <Link href="/signup" className="login-page__signup-link">
            {t('nav.signup')}
          </Link>
        </p>
      </main>
    </div>
  )
}
