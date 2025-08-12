/*
import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { supabase, validatePseudo } from '@/utils'
import { useAuth } from '@/hooks'
import { useToast } from '@/contexts'
import { Input, Button } from '@/components'
import Turnstile from 'react-turnstile'
import '../login/Login.scss'

export default function Signup() {
  const { user } = useAuth()
  const { show: showToast } = useToast()

  const [pseudo, setPseudo] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const pseudoError = validatePseudo(pseudo)
    if (pseudoError) {
      setError(pseudoError)
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (!captchaToken) {
      setError('Veuillez valider le CAPTCHA.')
      return
    }

    setLoading(true)

    const { data: exists, error: checkError } = await supabase.rpc(
      'email_exists',
      {
        email_to_check: email,
      }
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

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        captchaToken, // ✅ jeton Turnstile
        data: {
          pseudo,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      showToast(signUpError.message, 'error')
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
        <Input
          id="signup-pseudo"
          label="Pseudo"
          value={pseudo}
          onChange={e => setPseudo(e.target.value)}
          required
        />
        <Input
          id="signup-email"
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Input
          id="signup-password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <Input
          id="signup-confirm"
          label="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />

        <Turnstile
          sitekey="0x4AAAAAABoCZA_HK1b5uPRH"
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
*/
import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { supabase } from '@/utils' // ⬅️ on retire validatePseudo
import { useAuth } from '@/hooks'
import { useToast } from '@/contexts'
import { Input, Button } from '@/components'
import Turnstile from 'react-turnstile'
import '../login/Login.scss'

export default function Signup() {
  const { user } = useAuth()
  const { show: showToast } = useToast()

  // ⬇️ pseudo supprimé
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (!captchaToken) {
      setError('Veuillez valider le CAPTCHA.')
      return
    }

    setLoading(true)

    // Vérif e-mail déjà utilisé (rpc existante)
    const { data: exists, error: checkError } = await supabase.rpc(
      'email_exists',
      { email_to_check: email }
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

    // ⬇️ Pseudo par défaut = partie avant "@"
    const defaultPseudo = (email || '').split('@')[0] || 'Utilisateur'

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        captchaToken, // ✅ Turnstile
        data: {
          pseudo: defaultPseudo, // ✅ metadata pseudo par défaut
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      showToast(signUpError.message, 'error')
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
        {/* Champ pseudo supprimé */}

        <Input
          id="signup-email"
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Input
          id="signup-password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <Input
          id="signup-confirm"
          label="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />

        <Turnstile
          sitekey="0x4AAAAAABoCZA_HK1b5uPRH"
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
