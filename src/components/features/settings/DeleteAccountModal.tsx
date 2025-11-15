'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal, InputWithValidation } from '@/components'
import { useToast } from '@/contexts'
import { useAuth, useI18n } from '@/hooks'
import { supabase } from '@/utils/supabaseClient'
import { makeValidatePasswordNotEmpty } from '@/utils'
import Turnstile from 'react-turnstile'
import './DeleteAccountGuard.scss'

type Phase = 'login' | 'delete'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (turnstileToken: string) => void | Promise<void>
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const { t, language } = useI18n()
  const { user } = useAuth()
  const { show } = useToast()

  // Créer la fonction de validation i18n avec useMemo
  const validatePasswordNotEmpty = useMemo(
    () => makeValidatePasswordNotEmpty(t),
    [t]
  )

  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')

  // Un seul widget Turnstile, 2 phases : 'login' puis 'delete'
  const [phase, setPhase] = useState<Phase>('login')
  const [tokenLogin, setTokenLogin] = useState<string | null>(null)
  const [tokenDelete, setTokenDelete] = useState<string | null>(null)
  const [widgetKey, setWidgetKey] = useState(0)
  const [busy, setBusy] = useState(false)

  // Reset propre à chaque ouverture/fermeture du modal
  useEffect(() => {
    if (!isOpen) {
      setPhase('login')
      setTokenLogin(null)
      setTokenDelete(null)
      setWidgetKey(0)
      setBusy(false)
      setTyped('')
      setPassword('')
    }
  }, [isOpen])

  const deleteWord = language === 'fr' ? 'SUPPRIMER' : 'DELETE'

  const canSubmit = useMemo(() => {
    const wordOk = typed.trim().toUpperCase() === deleteWord
    const pwOk = validatePasswordNotEmpty(password) === ''
    const captchaOk = phase === 'login' ? !!tokenLogin : !!tokenDelete
    return wordOk && pwOk && captchaOk && !busy
  }, [
    typed,
    password,
    tokenLogin,
    tokenDelete,
    phase,
    busy,
    deleteWord,
    validatePasswordNotEmpty,
  ])

  const handleTurnstileSuccess = (token: string) => {
    if (phase === 'login') setTokenLogin(token)
    else setTokenDelete(token)
  }

  const reloadTurnstile = (nextPhase: Phase) => {
    setPhase(nextPhase)
    setWidgetKey(k => k + 1) // force un nouveau défi
    if (nextPhase === 'login') {
      setTokenDelete(null)
    } else {
      setTokenLogin(null)
    }
  }

  const handleConfirm = async () => {
    if (!canSubmit) return
    if (typeof onConfirm !== 'function') {
      console.error('DeleteAccountModal: onConfirm doit être une fonction.')
      show(t('profil.deleteModalInvalidAction'), 'error')
      return
    }

    try {
      setBusy(true)

      // Étape A — réauthentification (token de phase "login")
      if (phase === 'login') {
        const { error: reauthErr } = await supabase.auth.signInWithPassword(
          tokenLogin
            ? {
                email: user?.email || '',
                password,
                options: { captchaToken: tokenLogin },
              }
            : {
                email: user?.email || '',
                password,
              }
        )
        if (reauthErr) {
          show(t('profil.deleteModalErrorPassword'), 'error')
          return
        }
        // Passe en phase suppression et recharge le même widget
        reloadTurnstile('delete')
        show(t('profil.deleteModalSuccessVerify'), 'success')
        return
      }

      // Étape B — suppression (token distinct, même widget rechargé)
      await onConfirm(tokenDelete || '')
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        { label: t('profil.deleteModalCancel'), onClick: onClose },
        {
          label: busy
            ? t('profil.deleteModalProcessing')
            : phase === 'login'
              ? t('profil.deleteModalVerify')
              : t('profil.deleteModalDeleteFinal'),
          onClick: handleConfirm,
          variant: 'danger',
          disabled: !canSubmit,
          autoFocus: true,
        },
      ]}
    >
      <div className="delete-guard">
        <p className="delete-guard__intro">
          {language === 'fr' ? (
            <>
              Cette action est <strong>définitive</strong>. Pour confirmer :
            </>
          ) : (
            <>
              This action is <strong>final</strong>. To confirm:
            </>
          )}
        </p>

        <InputWithValidation
          id="delete-word"
          label={t('profil.deleteModalTypeDelete')}
          value={typed}
          onValid={setTyped}
          onChange={setTyped}
          rules={[
            v =>
              String(v).trim().toUpperCase() === deleteWord
                ? ''
                : t('profil.deleteModalTypeExactly'),
          ]}
        />

        <InputWithValidation
          id="delete-password"
          label={t('profil.deleteModalPassword')}
          type="password"
          value={password}
          onValid={setPassword}
          onChange={setPassword}
          rules={[validatePasswordNotEmpty]}
        />

        <div>
          <p className="delete-guard__note">
            {phase === 'login'
              ? t('profil.deleteModalStep1')
              : t('profil.deleteModalStep2')}
          </p>
          <Turnstile
            key={widgetKey}
            sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
            onSuccess={handleTurnstileSuccess}
            onExpire={() => {
              if (phase === 'login') setTokenLogin(null)
              else setTokenDelete(null)
            }}
            theme="light"
            language={language}
          />
        </div>
      </div>
    </Modal>
  )
}
