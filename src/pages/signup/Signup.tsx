import { useState, useRef } from 'react'
import type { FormEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import {
  supabase,
  validateEmail,
  normalizeEmail,
  validatePasswordStrength,
  makeMatchRule,
} from '@/utils'
import { useAuth, useI18n } from '@/hooks'
import { useToast } from '@/contexts'
import { InputWithValidation, Button, PasswordChecklist } from '@/components'
import Turnstile from 'react-turnstile'
import i18n from '@/config/i18n/i18n'
import '../login/Login.scss'

interface InputWithValidationRef {
  validateNow?: () => void
}

export default function Signup() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { show: showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const emailRef = useRef<InputWithValidationRef>(null)
  const pwRef = useRef<InputWithValidationRef>(null)
  const confirmRef = useRef<InputWithValidationRef>(null)

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    emailRef.current?.validateNow?.()
    pwRef.current?.validateNow?.()
    confirmRef.current?.validateNow?.()

    const e1 = validateEmail(email)
    const e2 = validatePasswordStrength(password)
    const e3 = confirmPassword === password ? '' : t('auth.passwordsDontMatch')
    if (e1 || e2 || e3) {
      setError(e1 || e2 || e3)
      return
    }

    if (!captchaToken) {
      setError(t('errors.validationError'))
      return
    }

    setLoading(true)

    const emailNorm = normalizeEmail(email)

    const { data: exists, error: checkError } = await supabase.rpc(
      'email_exists',
      { email_to_check: emailNorm }
    )

    if (checkError) {
      setError(t('errors.validationError'))
      setLoading(false)
      return
    }

    if (exists) {
      setError(t('auth.emailAlreadyUsed'))
      setLoading(false)
      return
    }

    const defaultPseudo = (emailNorm || '').split('@')[0] || t('auth.pseudo')

    const { error: signUpError } = await supabase.auth.signUp({
      email: emailNorm,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        captchaToken,
        data: { pseudo: defaultPseudo },
      },
    })

    if (signUpError) {
      setError(
        /Password should|weak password/i.test(signUpError.message)
          ? t('auth.passwordTooShort')
          : signUpError.message
      )
      showToast(t('auth.error'), 'error')
      setLoading(false)
      return
    }

    setSuccess(t('auth.resetEmailSent'))
    showToast(t('auth.checkYourEmail'), 'info')
    setLoading(false)
  }

  if (user) return <Navigate to="/tableau" replace />

  return (
    <div className="signup-page">
      <h1>{t('nav.createAccount')}</h1>

      <form onSubmit={handleSignup}>
        <InputWithValidation
          ref={emailRef as any}
          id="signup-email"
          label={t('auth.email')}
          type="email"
          value={email}
          onValid={val => setEmail(val)}
          rules={[validateEmail]}
        />

        <InputWithValidation
          ref={pwRef as any}
          id="signup-password"
          label={t('auth.password')}
          type="password"
          value={password}
          onValid={val => setPassword(val)}
          onChange={val => setPassword(val)}
          rules={[validatePasswordStrength]}
        />

        {/* ✅ Checklist repliable, fermée par défaut */}
        <PasswordChecklist
          password={password}
          collapsible
          defaultOpen={false}
        />

        <InputWithValidation
          ref={confirmRef as any}
          id="signup-confirm"
          label={t('auth.confirmPassword')}
          type="password"
          value={confirmPassword}
          onValid={val => setConfirmPassword(val)}
          rules={[makeMatchRule(() => password, t('auth.passwordsDontMatch'))]}
        />

        <Turnstile
          sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          onSuccess={token => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          theme="light"
          language={i18n.language}
        />

        <Button
          type="submit"
          disabled={loading || !captchaToken}
          label={loading ? t('app.loading') : t('nav.createAccount')}
        />

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>

      <hr className="separator" />

      <p>
        {t('nav.login')} <Link to="/login">{t('nav.login')}</Link>
      </p>
    </div>
  )
}
