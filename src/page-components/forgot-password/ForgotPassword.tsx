'use client'

import { useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { supabase, validateEmail, normalizeEmail } from '@/utils'
import { useToast } from '@/contexts'
import { useI18n } from '@/hooks'
import { Input, Button } from '@/components'
import Turnstile from 'react-turnstile'
import i18n from '@/config/i18n/i18n'
import './ForgotPassword.scss'

export default function ForgotPassword() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()
  const [success, setSuccess] = useState(false)

  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const e1 = validateEmail(email)
    setEmailError(e1)

    if (e1) {
      document.getElementById('forgot-email')?.focus()
      return
    }

    if (!captchaToken) {
      show(t('errors.validationError'), 'error')
      return
    }

    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizeEmail(email),
        { redirectTo, captchaToken }
      )

      if (error) throw error

      // Message générique anti-énumération (OWASP) — même réponse que l'email existe ou non
      setSuccess(true)
    } catch (err) {
      console.error('Erreur envoi reset :', (err as Error)?.message)
      show(t('errors.generic'), 'error')
    } finally {
      setCaptchaToken(null)
      setCaptchaKey(k => k + 1)
      setLoading(false)
    }
  }

  return (
    <div className="forgot-page">
      {/* ── HEADER MARQUE ── */}
      <header className="forgot-page__header">
        {/* Logo décoratif : aria-hidden car "Appli-Picto" est écrit en clair ci-dessous */}
        <div className="forgot-page__logo" aria-hidden="true">
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
        <h1 className="forgot-page__title">Appli-Picto</h1>
        <p className="forgot-page__tagline">La journée en pictogrammes</p>
      </header>

      {/* ── CARTE FORMULAIRE ── */}
      <main className="forgot-page__card">
        {success ? (
          /* Message générique anti-énumération (OWASP) */
          <div className="forgot-page__success" role="alert" aria-live="polite">
            <p>
              Si un compte existe pour cet email, vous recevrez un lien de
              réinitialisation. Vérifiez votre boîte de réception.
            </p>
            <p className="forgot-page__back">
              <Link href="/login" className="forgot-page__back-link">
                Retour à la connexion
              </Link>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Formulaire de réinitialisation du mot de passe"
          >
            <h2 className="forgot-page__form-title">Mot de passe oublié ?</h2>
            <p className="forgot-page__form-subtitle">
              Saisissez votre email pour recevoir un lien de réinitialisation.
            </p>

            {/* Champ email */}
            <div className="forgot-page__field">
              <Input
                id="forgot-email"
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

            {/* Cloudflare Turnstile */}
            <div className="forgot-page__captcha">
              <Turnstile
                key={captchaKey}
                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                onSuccess={token => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                theme="light"
                language={i18n.language}
              />
            </div>

            {/* Bouton toujours saturé — pattern Login */}
            <Button
              type="submit"
              label={t('auth.resetPassword')}
              variant="primary"
              isLoading={loading}
              className="forgot-page__submit"
            />

            {/* Lien retour */}
            <p className="forgot-page__back">
              <Link href="/login" className="forgot-page__back-link">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  )
}
