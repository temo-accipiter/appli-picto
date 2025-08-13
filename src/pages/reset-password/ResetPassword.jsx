import { useState, useEffect, useRef } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { InputWithValidation, Button, PasswordChecklist } from '@/components'
import { supabase, validatePasswordStrength, makeMatchRule } from '@/utils'
import './ResetPassword.scss'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [recoveryHandled, setRecoveryHandled] = useState(false)

  const pwRef = useRef(null)
  const confirmRef = useRef(null)

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

    pwRef.current?.validateNow?.()
    confirmRef.current?.validateNow?.()

    const e1 = validatePasswordStrength(password)
    const e2 =
      confirm === password ? '' : 'Les mots de passe ne correspondent pas.'
    if (e1 || e2) {
      setError(e1 || e2)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      const msg = /Password should|weak password/i.test(error.message)
        ? 'Ton mot de passe ne respecte pas les exigences de sécurité.'
        : error.message
      setError(msg)
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
          <InputWithValidation
            ref={pwRef}
            id="new-password"
            label="Nouveau mot de passe"
            type="password"
            value={password}
            onValid={val => setPassword(val)}
            onChange={val => setPassword(val)}
            rules={[validatePasswordStrength]}
          />

          {/* ✅ Checklist repliable (fermée par défaut) */}
          <PasswordChecklist
            password={password}
            collapsible
            defaultOpen={false}
          />

          <InputWithValidation
            ref={confirmRef}
            id="confirm-password"
            label="Confirmer le mot de passe"
            type="password"
            value={confirm}
            onValid={val => setConfirm(val)}
            rules={[
              makeMatchRule(
                () => password,
                'Les mots de passe ne correspondent pas.'
              ),
            ]}
          />

          <Button type="submit" label="Valider" variant="primary" />

          {error && <p className="error">{error}</p>}
        </form>
      )}
    </div>
  )
}
