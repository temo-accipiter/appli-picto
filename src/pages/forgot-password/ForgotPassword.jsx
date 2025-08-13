// src/pages/forgot-password/ForgotPassword.jsx
import { useState, useRef } from 'react'
import { supabase } from '@/utils'
import { useToast } from '@/contexts'
import { InputWithValidation, Button } from '@/components'
import { validateEmail, normalizeEmail } from '@/utils'
import Turnstile from 'react-turnstile'
import './ForgotPassword.scss'

export default function ForgotPassword() {
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
      show('Merci de valider le CAPTCHA.', 'error')
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

      show(
        'Si un compte existe avec cette adresse, un e-mail a été envoyé ✅',
        'success'
      )
      setSuccess(true)
    } catch (err) {
      console.error('Erreur envoi reset :', err?.message)
      show('Une erreur est survenue lors de l’envoi du lien.', 'error')
    } finally {
      // invalider le token et régénérer le widget
      setCaptchaToken(null)
      setCaptchaKey(k => k + 1)
      setLoading(false)
    }
  }

  return (
    <div className="forgot-password-page">
      <h1>Mot de passe oublié</h1>
      <p>Entre ton adresse e-mail pour recevoir un lien de réinitialisation.</p>

      <form onSubmit={handleSubmit}>
        <InputWithValidation
          ref={emailRef}
          id="forgot-email"
          type="email"
          label="Adresse e-mail"
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
        />

        <Button
          type="submit"
          label={loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          disabled={loading || success || !captchaToken}
          variant="primary"
        />
      </form>
    </div>
  )
}
