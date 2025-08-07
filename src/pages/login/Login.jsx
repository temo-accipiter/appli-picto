/*
import { useState } from 'react'
import { Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'
import { useToast } from '@/contexts'
import { Input, Button } from '@/components'
import './Login.scss'

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { show: showToast } = useToast()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
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

  // ✅ Bloque la redirection auto si on est sur /reset-password
  if (user && location.pathname !== '/reset-password') {
    return <Navigate to="/tableau" replace />
  }

  return (
    <div className="login-page">
      <h1>Connexion</h1>
      <form onSubmit={handleLogin}>
        <Input
          id="login-email"
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <Input
          id="login-password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <p className="forgot-password">
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
        </p>

        <Button
          type="submit"
          label={loading ? 'Connexion...' : 'Se connecter'}
          disabled={loading}
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
*/
import { useState } from 'react'
import { Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'
import { useToast } from '@/contexts'
import { Input, Button } from '@/components'
import Turnstile from 'react-turnstile' // ✅ import direct
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

  const handleLogin = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!captchaToken) {
      setError('Merci de valider le CAPTCHA.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken, // ✅ Turnstile token transmis à Supabase
      },
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
        <Input
          id="login-email"
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <Input
          id="login-password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <Turnstile
          sitekey="0x4AAAAAABoCZA_HK1b5uPRH"
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
