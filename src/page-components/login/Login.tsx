'use client'

import { useState, useRef } from 'react'
import type { FormEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'
import { useAuth, useI18n } from '@/hooks'
import { useToast } from '@/contexts'
import { InputWithValidation, Button } from '@/components'
import {
  validateEmail,
  validatePasswordNotEmpty,
  normalizeEmail,
} from '@/utils'
import Turnstile from 'react-turnstile'
import i18n from '@/config/i18n/i18n'
import './Login.scss'

interface InputWithValidationRef {
  validateNow?: () => void
}

export default function Login() {
  const { user } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const { show: showToast } = useToast()
  const pathname = usePathname()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // refs pour forcer la validation si pas de blur
  const emailRef = useRef<InputWithValidationRef>(null)
  const pwRef = useRef<InputWithValidationRef>(null)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // force l'affichage des erreurs
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
      setError(t('errors.validationError'))
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
      setError(t('auth.invalidCredentials'))
      showToast(t('auth.invalidCredentials'), 'error')
    } else {
      showToast(t('auth.loginSuccess'), 'success')
      router.push('/tableau')
    }

    setLoading(false)
  }

  if (user && pathname !== '/reset-password') {
    router.push('/tableau')
    return null
  }

  return (
    <div className="login-page">
      <h1>{t('nav.login')}</h1>
      <form onSubmit={handleLogin}>
        <InputWithValidation
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={emailRef as any}
          id="login-email"
          label={t('auth.email')}
          type="email"
          value={email}
          onValid={val => setEmail(val)}
          rules={[validateEmail]}
        />

        <InputWithValidation
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={pwRef as any}
          id="login-password"
          label={t('auth.password')}
          type="password"
          value={password}
          onValid={val => setPassword(val)}
          rules={[validatePasswordNotEmpty]}
        />

        <Turnstile
          sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
          onSuccess={token => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          theme="light"
          language={i18n.language}
        />

        <p className="forgot-password">
          <Link href="/forgot-password">{t('auth.forgotPassword')}</Link>
        </p>

        <Button
          type="submit"
          label={loading ? t('app.loading') : t('nav.login')}
          disabled={loading || !captchaToken}
        />

        {error && <p className="error">{error}</p>}
      </form>

      <hr />

      <p>
        {t('nav.createAccount')} <Link href="/signup">{t('nav.signup')}</Link>
      </p>
    </div>
  )
}
