// src/components/settings/DeleteAccountGuard.tsx
import { Button, InputWithValidation } from '@/components'
import { useToast } from '@/contexts'
import useAuth from '@/hooks/useAuth'
import { useI18n } from '@/hooks'
import { supabase, validatePasswordNotEmpty } from '@/utils'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Turnstile from 'react-turnstile'
import { InputWithValidationRef } from '@/components/shared/input-with-validation/InputWithValidation'
import './DeleteAccountGuard.scss'

const equalsRule =
  (expected: string, msg: string) =>
  (val = '') =>
    String(val).trim() === expected ? '' : msg

interface DeleteAccountGuardProps {
  onConfirm: (params: { turnstileToken?: string }) => Promise<void>
  dangerWord?: string
  turnstileSiteKey?: string
  countdownSec?: number
}

export default function DeleteAccountGuard({
  onConfirm,
  dangerWord = 'SUPPRIMER',
  turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY,
  countdownSec = 5,
}: DeleteAccountGuardProps) {
  const { user } = useAuth()
  const { show } = useToast()
  const { language } = useI18n()

  const [word, setWord] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [needsTotp, setNeedsTotp] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [left, setLeft] = useState(countdownSec)

  const wordRef = useRef<InputWithValidationRef>(null)
  const pwRef = useRef<InputWithValidationRef>(null)
  const totpRef = useRef<InputWithValidationRef>(null)

  useEffect(() => {
    let ignore = false
    const checkMfa = async () => {
      try {
        const { data } = await supabase.auth.mfa.listFactors()
        const totpEnabled = (data?.totp || []).some(
          f => f.status === 'verified'
        )
        if (!ignore) setNeedsTotp(!!totpEnabled)
      } catch {
        // Gestion silencieuse des erreurs MFA
      }
    }
    checkMfa()
    return () => {
      ignore = true
    }
  }, [])

  const allFieldsValid = useMemo(() => {
    const wordOk =
      equalsRule(dangerWord, `Tape exactement « ${dangerWord} »`)(word) === ''
    const pwOk = validatePasswordNotEmpty(password) === ''
    const totpOk = !needsTotp || /^\d{6}$/.test(String(totp).trim())
    return wordOk && pwOk && totpOk && !!captchaToken
  }, [word, password, totp, needsTotp, captchaToken, dangerWord])

  useEffect(() => {
    if (!allFieldsValid || left <= 0) return
    const t = setTimeout(() => setLeft(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearTimeout(t)
  }, [allFieldsValid, left])

  const reauthenticate = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    if (!error && !data?.user?.factors) return
    if (needsTotp) {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = (factors?.totp || []).find(
        f => f.status === 'verified'
      )
      if (!totpFactor) throw new Error('TOTP factor not found')

      const { data: challenge } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })
      if (!challenge) throw new Error('MFA challenge failed')

      await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: String(totp).trim(),
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    wordRef.current?.validateNow?.()
    pwRef.current?.validateNow?.()
    if (needsTotp) totpRef.current?.validateNow?.()
    if (!allFieldsValid || left > 0) return

    try {
      setLoading(true)
      await reauthenticate()
      if (captchaToken) {
        await onConfirm({ turnstileToken: captchaToken })
      }
      show('Compte supprimé', 'success')
    } catch (err) {
      const msg = (err as Error)?.message || 'Erreur lors de la vérification.'
      setError(msg)
      show(msg, 'error')
      setCaptchaToken(null)
      setLeft(countdownSec)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="delete-guard" onSubmit={handleSubmit}>
      <p className="delete-guard__intro">
        Cette action est <strong>définitive</strong>. Pour confirmer :
      </p>

      <InputWithValidation
        ref={wordRef}
        id="delete-word"
        label={`Tape « ${dangerWord} »`}
        value={word}
        onValid={setWord}
        onChange={setWord}
        rules={[equalsRule(dangerWord, `Tape exactement « ${dangerWord} »`)]}
      />

      <InputWithValidation
        ref={pwRef}
        id="delete-password"
        label="Mot de passe"
        type="password"
        value={password}
        onValid={setPassword}
        onChange={setPassword}
        rules={[validatePasswordNotEmpty]}
      />

      {needsTotp && (
        <InputWithValidation
          ref={totpRef}
          id="delete-totp"
          label="Code TOTP (6 chiffres)"
          value={totp}
          onValid={setTotp}
          onChange={setTotp}
          rules={[
            v =>
              /^\d{6}$/.test(String(v).trim())
                ? ''
                : 'Entre le code TOTP à 6 chiffres.',
          ]}
        />
      )}

      <Turnstile
        sitekey={turnstileSiteKey}
        onSuccess={token => setCaptchaToken(token)}
        onExpire={() => setCaptchaToken(null)}
        theme="light"
        language={language}
      />

      <Button
        type="submit"
        variant="danger"
        disabled={!allFieldsValid || left > 0 || loading}
        label={
          loading
            ? 'Suppression…'
            : !allFieldsValid
              ? 'Complète les étapes'
              : left > 0
                ? `Supprimer (${left})`
                : 'Supprimer définitivement'
        }
      />

      {error && <p className="delete-guard__error">{error}</p>}
      <p className="delete-guard__note" role="note">
        Astuce : ferme cette fenêtre pour annuler.
      </p>
    </form>
  )
}
