'use client'

import { useState, useEffect } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, validatePasswordStrength } from '@/utils'
import { useAuth, useI18n } from '@/hooks'
import { Input, Button, PasswordChecklist } from '@/components'
import './ResetPassword.scss'

export default function ResetPassword() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [recoveryHandled, setRecoveryHandled] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)

  const fromEmailLink =
    typeof window !== 'undefined' &&
    window.location.hash.includes('access_token')

  useEffect(() => {
    const extractAccessToken = (hash: string) => {
      const params = new URLSearchParams(hash.replace('#', ''))
      return params.get('access_token')
    }

    const handleRecovery = async () => {
      const token = extractAccessToken(window.location.hash)
      if (!token) {
        setInvalidToken(true)
        setRecoveryHandled(true)
        return
      }

      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: 'ignore-refresh-token',
      })

      if (error) {
        console.error('❌ supabase.auth.setSession :', error.message)
        setInvalidToken(true)
      } else {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        )
      }

      setRecoveryHandled(true)
    }

    if (fromEmailLink) {
      handleRecovery()
    } else {
      setRecoveryHandled(true)
    }
  }, [fromEmailLink])

  if (!authLoading && recoveryHandled && !user && !invalidToken) {
    router.push('/login')
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    const e1 = validatePasswordStrength(password)
    const e2 = confirm !== password ? t('auth.passwordsDontMatch') : ''

    setPasswordError(e1)
    setConfirmError(e2)
    setConfirmTouched(true)

    if (e1 || e2) {
      if (e1) document.getElementById('reset-password')?.focus()
      else document.getElementById('reset-confirm')?.focus()
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        const msg = /Password should|weak password/i.test(error.message)
          ? t('auth.passwordTooShort')
          : t('errors.generic')
        setSubmitError(msg)
      } else {
        setSuccess(true)
      }
    } catch {
      setSubmitError(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reset-page">
      {/* ── HEADER MARQUE ── */}
      <header className="reset-page__header">
        {/* Logo décoratif : aria-hidden car "Appli-Picto" est écrit en clair ci-dessous */}
        <div className="reset-page__logo" aria-hidden="true">
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
        <h1 className="reset-page__title">Appli-Picto</h1>
        <p className="reset-page__tagline">La journée en pictogrammes</p>
      </header>

      {/* ── CARTE FORMULAIRE ── */}
      <main className="reset-page__card">
        {invalidToken ? (
          /* Token invalide ou expiré */
          <div className="reset-page__error-token" role="alert">
            <p>
              Ce lien de réinitialisation est invalide ou a expiré. Demandez un
              nouveau lien.
            </p>
            <p className="reset-page__back">
              <Link href="/forgot-password" className="reset-page__back-link">
                Demander un nouveau lien
              </Link>
            </p>
          </div>
        ) : success ? (
          /* Message de confirmation post-soumission */
          <div className="reset-page__success" role="status" aria-live="polite">
            <p>
              Votre mot de passe a été réinitialisé avec succès. Vous pouvez
              maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <p className="reset-page__back">
              <Link href="/login" className="reset-page__back-link">
                Se connecter
              </Link>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Formulaire de réinitialisation du mot de passe"
          >
            <h2 className="reset-page__form-title">
              Réinitialiser votre mot de passe
            </h2>
            <p className="reset-page__form-subtitle">
              Choisissez un nouveau mot de passe pour votre compte.
            </p>

            {/* Champ nouveau mot de passe */}
            <div className="reset-page__field">
              <Input
                id="reset-password"
                label={t('auth.newPassword')}
                type="password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                autoComplete="new-password"
                error={passwordError}
                autoFocus
              />
              {/* Checklist discrète, toujours visible, sans accordion */}
              <div className="reset-page__checklist">
                <PasswordChecklist password={password} />
              </div>
            </div>

            {/* Champ confirmation mot de passe */}
            <div className="reset-page__field">
              <Input
                id="reset-confirm"
                label={t('auth.confirmPassword')}
                type="password"
                value={confirm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setConfirm(e.target.value)
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
                    confirm !== password ? t('auth.passwordsDontMatch') : ''
                  )
                }}
                autoComplete="new-password"
                error={confirmError}
              />
            </div>

            {/* Erreur de soumission */}
            {submitError && (
              <div
                className="reset-page__submit-error"
                role="alert"
                aria-live="polite"
              >
                <p>{submitError}</p>
              </div>
            )}

            {/* Bouton toujours saturé — pattern Login/Signup */}
            <Button
              type="submit"
              label={t('auth.resetPassword')}
              variant="primary"
              isLoading={loading}
              className="reset-page__submit"
            />

            {/* Lien retour */}
            <p className="reset-page__back">
              <Link href="/login" className="reset-page__back-link">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  )
}
