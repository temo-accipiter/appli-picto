import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { Modal, InputWithValidation } from '@/components'
import { useToast } from '@/contexts'
import { useAuth } from '@/hooks'
import { supabase } from '@/utils'
import { validatePasswordNotEmpty } from '@/utils'
import Turnstile from 'react-turnstile'
import './DeleteAccountGuard.scss'

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm, // function(turnstileTokenForDeletion)
}) {
  const { user } = useAuth()
  const { show } = useToast()

  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')

  // Un seul widget Turnstile, 2 phases : 'login' puis 'delete'
  const [phase, setPhase] = useState('login')
  const [tokenLogin, setTokenLogin] = useState(null)
  const [tokenDelete, setTokenDelete] = useState(null)
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

  const canSubmit = useMemo(() => {
    const wordOk = typed.trim().toUpperCase() === 'SUPPRIMER'
    const pwOk = validatePasswordNotEmpty(password) === ''
    const captchaOk = phase === 'login' ? !!tokenLogin : !!tokenDelete
    return wordOk && pwOk && captchaOk && !busy
  }, [typed, password, tokenLogin, tokenDelete, phase, busy])

  const handleTurnstileSuccess = token => {
    if (phase === 'login') setTokenLogin(token)
    else setTokenDelete(token)
  }

  const reloadTurnstile = nextPhase => {
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
      show('Action invalide. Réessaie.', 'error')
      return
    }

    try {
      setBusy(true)

      // Étape A — réauthentification (token de phase "login")
      if (phase === 'login') {
        const { error: reauthErr } = await supabase.auth.signInWithPassword({
          email: user?.email,
          password,
          options: { captchaToken: tokenLogin },
        })
        if (reauthErr) {
          show('Mot de passe incorrect ou CAPTCHA expiré.', 'error')
          return
        }
        // Passe en phase suppression et recharge le même widget
        reloadTurnstile('delete')
        show('Vérification OK. Confirme le CAPTCHA pour supprimer.', 'success')
        return
      }

      // Étape B — suppression (token distinct, même widget rechargé)
      await onConfirm(tokenDelete)
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
        { label: 'Annuler', onClick: onClose },
        {
          label: busy
            ? 'Traitement…'
            : phase === 'login'
              ? 'Vérifier et continuer'
              : 'Supprimer définitivement',
          onClick: handleConfirm,
          variant: 'danger',
          disabled: !canSubmit,
          autoFocus: true,
        },
      ]}
    >
      <div className="delete-guard">
        <p className="delete-guard__intro">
          Cette action est <strong>définitive</strong>. Pour confirmer :
        </p>

        <InputWithValidation
          id="delete-word"
          label="Tape « SUPPRIMER »"
          value={typed}
          onValid={setTyped}
          onChange={setTyped}
          rules={[
            v =>
              String(v).trim().toUpperCase() === 'SUPPRIMER'
                ? ''
                : 'Tape exactement « SUPPRIMER »',
          ]}
        />

        <InputWithValidation
          id="delete-password"
          label="Mot de passe"
          type="password"
          value={password}
          onValid={setPassword}
          onChange={setPassword}
          rules={[validatePasswordNotEmpty]}
        />

        <div>
          <p className="delete-guard__note">
            {phase === 'login'
              ? 'Étape 1 : vérification de connexion'
              : 'Étape 2 : confirmer la suppression'}
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
          />
        </div>
      </div>
    </Modal>
  )
}

DeleteAccountModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}
