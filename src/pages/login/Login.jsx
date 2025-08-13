import { useState, useRef } from 'react'
import { Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'
import { useToast } from '@/contexts'
import { InputWithValidation, Button } from '@/components'
import {
  validateEmail,
  validatePasswordNotEmpty,
  normalizeEmail,
} from '@/utils'
import Turnstile from 'react-turnstile'
import './Login.scss'

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { show: showToast } = useToast()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // refs pour forcer la validation si pas de blur
  const emailRef = useRef(null)
  const pwRef = useRef(null)

  const handleLogin = async e => {
    e.preventDefault()
    setError('')

    // force l’affichage des erreurs
    emailRef.current?.validateNow?.()
    pwRef.current?.validateNow?.()

    // filet de sécurité (mêmes règles que le composant)
    const e1 = validateEmail(email)
    const e2 = validatePasswordNotEmpty(password)
    if (e1 || e2) {
      setError(e1 || e2)
      return
    }

    if (!captchaToken) {
      setError('Merci de valider le CAPTCHA.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
      options: { captchaToken },
    })

    if (error) {
      console.warn('Erreur login :', error.message)
      setError('Email ou mot de passe incorrect.')
      showToast('Email ou mot de passe incorrect.', 'error')
    } else {
      showToast('Connexion réussie', 'success')
      navigate('/tableau')
    }

    setLoading(false)
  }

  if (user && location.pathname !== '/reset-password') {
    return <Navigate to="/tableau" replace />
  }

  return (
    <div className="login-page">
      <h1>Connexion</h1>
      <form onSubmit={handleLogin}>
        <InputWithValidation
          ref={emailRef}
          id="login-email"
          label="Adresse e-mail"
          type="email"
          value={email}
          onValid={val => setEmail(val)}
          rules={[validateEmail]}
        />

        <InputWithValidation
          ref={pwRef}
          id="login-password"
          label="Mot de passe"
          type="password"
          value={password}
          onValid={val => setPassword(val)}
          rules={[validatePasswordNotEmpty]}
        />

        <Turnstile
          sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          onSuccess={token => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          theme="light"
        />

        <p className="forgot-password">
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
        </p>

        <Button
          type="submit"
          label={loading ? 'Connexion...' : 'Se connecter'}
          disabled={loading || !captchaToken}
        />

        {error && <p className="error">{error}</p>}
      </form>

      <hr />

      <p>
        Pas encore de compte ? <Link to="/signup">Créer un compte</Link>
      </p>
    </div>
  )
}
