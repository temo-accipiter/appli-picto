import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth, useI18n } from '@/hooks'
import { InputWithValidation, Button, PasswordChecklist } from '@/components'
import { supabase, validatePasswordStrength, makeMatchRule } from '@/utils'
import './ResetPassword.scss'

interface InputWithValidationRef {
  validateNow?: () => void
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { t } = useI18n()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [recoveryHandled, setRecoveryHandled] = useState(false)

  const pwRef = useRef<InputWithValidationRef>(null)
  const confirmRef = useRef<InputWithValidationRef>(null)

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
        setError(t('errors.validationError'))
        setRecoveryHandled(true)
        return
      }

      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: 'ignore-refresh-token',
      })

      if (error) {
        console.error('❌ supabase.auth.setSession :', error.message)
        setError(t('errors.unauthorized'))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromEmailLink])

  if (!loading && recoveryHandled && !user) {
    return <Navigate to="/login" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    pwRef.current?.validateNow?.()
    confirmRef.current?.validateNow?.()

    const e1 = validatePasswordStrength(password)
    const e2 = confirm === password ? '' : t('auth.passwordsDontMatch')
    if (e1 || e2) {
      setError(e1 || e2)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      const msg = /Password should|weak password/i.test(error.message)
        ? t('auth.passwordTooShort')
        : error.message
      setError(msg)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  return (
    <div className="reset-password-page">
      <h1>{t('auth.resetPassword')}</h1>

      {success ? (
        <p className="success">{t('auth.loginSuccess')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="reset-form">
          <InputWithValidation
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={pwRef as any}
            id="new-password"
            label={t('auth.newPassword')}
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={confirmRef as any}
            id="confirm-password"
            label={t('auth.confirmPassword')}
            type="password"
            value={confirm}
            onValid={val => setConfirm(val)}
            rules={[
              makeMatchRule(() => password, t('auth.passwordsDontMatch')),
            ]}
          />

          <Button
            type="submit"
            label={t('actions.confirm')}
            variant="primary"
          />

          {error && <p className="error">{error}</p>}
        </form>
      )}
    </div>
  )
}
