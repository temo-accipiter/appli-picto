import { useState, useRef } from 'react'
import { Navigate, Link } from 'react-router-dom'
import {
  supabase,
  validateEmail,
  normalizeEmail,
  validatePasswordStrength,
  makeMatchRule,
} from '@/utils'
import { useAuth } from '@/hooks'
import { useToast } from '@/contexts'
import { InputWithValidation, Button, PasswordChecklist } from '@/components'
import Turnstile from 'react-turnstile'
import '../login/Login.scss'

export default function Signup() {
  const { user } = useAuth()
  const { show: showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const emailRef = useRef(null)
  const pwRef = useRef(null)
  const confirmRef = useRef(null)

  const handleSignup = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    emailRef.current?.validateNow?.()
    pwRef.current?.validateNow?.()
    confirmRef.current?.validateNow?.()

    const e1 = validateEmail(email)
    const e2 = validatePasswordStrength(password)
    const e3 =
      confirmPassword === password
        ? ''
        : 'Les mots de passe ne correspondent pas.'
    if (e1 || e2 || e3) {
      setError(e1 || e2 || e3)
      return
    }

    if (!captchaToken) {
      setError('Veuillez valider le CAPTCHA.')
      return
    }

    setLoading(true)

    const emailNorm = normalizeEmail(email)

    const { data: exists, error: checkError } = await supabase.rpc(
      'email_exists',
      { email_to_check: emailNorm }
    )

    if (checkError) {
      setError("Erreur lors de la vérification de l'e-mail")
      setLoading(false)
      return
    }

    if (exists) {
      setError(
        'Impossible de créer le compte. Vérifie que cette adresse n’est pas déjà utilisée.'
      )
      setLoading(false)
      return
    }

    const defaultPseudo = (emailNorm || '').split('@')[0] || 'Utilisateur'

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
          ? 'Ton mot de passe ne respecte pas les exigences de sécurité.'
          : signUpError.message
      )
      showToast('Échec de création du compte', 'error')
      setLoading(false)
      return
    }

    setSuccess('Un lien de confirmation a été envoyé par e-mail.')
    showToast('Vérifie ta boîte mail pour confirmer ton compte', 'info')
    setLoading(false)
  }

  if (user) return <Navigate to="/tableau" replace />

  return (
    <div className="signup-page">
      <h1>Créer un compte</h1>

      <form onSubmit={handleSignup}>
        <InputWithValidation
          ref={emailRef}
          id="signup-email"
          label="Adresse e-mail"
          type="email"
          value={email}
          onValid={val => setEmail(val)}
          rules={[validateEmail]}
        />

        <InputWithValidation
          ref={pwRef}
          id="signup-password"
          label="Mot de passe"
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
          ref={confirmRef}
          id="signup-confirm"
          label="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onValid={val => setConfirmPassword(val)}
          rules={[
            makeMatchRule(
              () => password,
              'Les mots de passe ne correspondent pas.'
            ),
          ]}
        />

        <Turnstile
          sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          onSuccess={token => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          theme="light"
        />

        <Button
          type="submit"
          disabled={loading || !captchaToken}
          label={loading ? 'Création...' : 'Créer un compte'}
        />

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>

      <hr className="separator" />

      <p>
        Déjà inscrit ? <Link to="/login">Se connecter</Link>
      </p>
    </div>
  )
}
