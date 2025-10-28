// src/pages/forgot-password/ForgotPassword.jsx
import { useState, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useToast } from '@/contexts'
import { useI18n } from '@/hooks'
import { InputWithValidation, Button } from '@/components'
import { validateEmail, normalizeEmail } from '@/utils'
import Turnstile from 'react-turnstile'
import i18n from '@/config/i18n/i18n'
import './ForgotPassword.scss'

export default function ForgotPassword() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()
  const [success, setSuccess] = useState(false)

  // ✅ Captcha Turnstile
  const [captchaToken, setCaptchaToken] = useState(null)
  const [captchaKey, setCaptchaKey] = useState(0) // forcer un refresh

  // Ref pour forcer la validation si pas de blur
  const emailRef = useRef(null)

  const handleSubmit = async e => {
    e.preventDefault()

    // Validation front (message FR immédiat)
    emailRef.current?.validateNow?.()
    const e1 = validateEmail(email)
    if (e1) {
      show(e1, 'error')
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
        {
          redirectTo,
          captchaToken, // ⬅️ requis si Captcha activé côté Supabase
        }
      )

      if (error) throw error

      show(t('auth.resetEmailSent'), 'success')
      setSuccess(true)
    } catch (err) {
      console.error('Erreur envoi reset :', err?.message)
      show(t('errors.generic'), 'error')
    } finally {
      // invalider le token et régénérer le widget
      setCaptchaToken(null)
      setCaptchaKey(k => k + 1)
      setLoading(false)
    }
  }

  return (
    <div className="forgot-password-page">
      <h1>{t('auth.forgotPassword')}</h1>
      <p>{t('auth.checkYourEmail')}</p>

      <form onSubmit={handleSubmit}>
        <InputWithValidation
          ref={emailRef}
          id="forgot-email"
          type="email"
          label={t('auth.email')}
          value={email}
          onValid={val => setEmail(val)}
          rules={[validateEmail]}
        />

        {/* ✅ Captcha Cloudflare Turnstile (clé depuis .env.local) */}
        <Turnstile
          key={captchaKey}
          sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          onSuccess={token => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          options={{ refreshExpired: 'auto' }}
          theme="light"
          language={i18n.language}
        />

        <Button
          type="submit"
          label={loading ? t('app.loading') : t('auth.resetPassword')}
          disabled={loading || success || !captchaToken}
          variant="primary"
        />
      </form>
    </div>
  )
}
