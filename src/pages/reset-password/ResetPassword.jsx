import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '@/utils'
import { useAuth } from '@/hooks'
import { Input, Button } from '@/components'
import './ResetPassword.scss'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [recoveryHandled, setRecoveryHandled] = useState(false)

  const fromEmailLink =
    typeof window !== 'undefined' &&
    window.location.hash.includes('access_token')

  useEffect(() => {
    const extractAccessToken = hash => {
      const params = new URLSearchParams(hash.replace('#', ''))
      return params.get('access_token')
    }

    const handleRecovery = async () => {
      const token = extractAccessToken(window.location.hash)
      if (!token) {
        setError('Lien invalide.')
        setRecoveryHandled(true)
        return
      }

      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: 'ignore-refresh-token',
      })

      if (error) {
        console.error('❌ supabase.auth.setSession :', error.message)
        setError('Session invalide ou expirée.')
      } else {
        console.log('✅ Session manuelle restaurée')
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

  if (!loading && recoveryHandled && !user) {
    return <Navigate to="/login" replace />
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  return (
    <div className="reset-password-page">
      <h1>Réinitialiser mon mot de passe</h1>

      {success ? (
        <p className="success">
          Mot de passe modifié avec succès. Redirection vers la connexion…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="reset-form">
          <Input
            id="new-password"
            label="Nouveau mot de passe"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <Input
            id="confirm-password"
            label="Confirmer le mot de passe"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />

          <Button type="submit" label="Valider" variant="primary" />

          {error && <p className="error">{error}</p>}
        </form>
      )}
    </div>
  )
}
