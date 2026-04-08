'use client'

// src/pages/profil/Profil.tsx
import {
  ChildProfileSelector,
  AvatarProfil,
  Button,
  DeleteAccountModal,
  FloatingPencil,
  InputWithValidation,
  ModalConfirm,
} from '@/components'
import { ChildProfileManager } from '@/components/features/child-profile'
import DeviceList from '@/components/features/profil/device-list/DeviceList'
import { useToast } from '@/contexts'
import { useAuth, useI18n, useAccountStatus } from '@/hooks'
import useDeviceRegistration from '@/hooks/useDeviceRegistration'
import {
  getDisplayPseudo,
  makeNoDoubleSpaces,
  makeNoEdgeSpaces,
  makeValidatePseudo,
  normalizeSpaces,
  supabase,
} from '@/utils'
import { buildRLSPath } from '@/utils/storage/uploadImage'
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Turnstile from 'react-turnstile'
import i18n from '@/config/i18n/i18n'
import './Profil.scss'

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function Profil() {
  const { t } = useI18n()
  const {
    isSubscriber: isActive,
    status,
    statusDisplay,
    loading,
  } = useAccountStatus()

  const { user, signOut } = useAuth()
  const { show: showToast } = useToast()
  const router = useRouter()

  // ── S10 : Enregistrement device + gestion devices ─────────────────────────
  // deviceId : UUID de l'appareil actuel (localStorage), transmis à DeviceList
  //            pour l'identifier visuellement dans la liste.
  // registrationError : 'quota' si le quota appareils est atteint → toast adulte.
  const { deviceId, registrationError } = useDeviceRegistration()

  // Toast unique si quota appareils atteint (§6.4 — message contractuel)
  const quotaToastShown = useRef(false)
  useEffect(() => {
    if (registrationError === 'quota' && !quotaToastShown.current) {
      quotaToastShown.current = true
      showToast("Nombre maximum d'appareils atteint.", 'warning')
    }
  }, [registrationError, showToast])

  const [pseudo, setPseudo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDeleteAvatar, setConfirmDeleteAvatar] = useState(false)
  const [captchaTokenReset, setCaptchaTokenReset] = useState<string | null>(
    null
  )
  const [captchaKey, setCaptchaKey] = useState(0)
  const [tempAvatarPath, setTempAvatarPath] = useState<string | null>(null)
  const [avatarKey, setAvatarKey] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // même logique d'affichage que le UserMenu (DB > metadata > email)
  const displayPseudo = getDisplayPseudo(user, pseudo)

  // Créer les fonctions de validation i18n avec useMemo
  const noEdgeSpaces = useMemo(() => makeNoEdgeSpaces(t), [t])
  const noDoubleSpaces = useMemo(() => makeNoDoubleSpaces(t), [t])
  const validatePseudoMaxLength = useMemo(() => makeValidatePseudo(t), [t])

  useEffect(() => {
    if (!user) return
    setPseudo(String(user.user_metadata?.pseudo || '').trim())
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isSaving) return

    setIsSaving(true)

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 handleSave - Début sauvegarde profil', {
          pseudo,
        })
      }

      // Bloque si règle violée
      const pseudoMsg = noEdgeSpaces(pseudo) || noDoubleSpaces(pseudo)
      if (pseudoMsg) {
        showToast(t('profil.fixFieldErrors'), 'error')
        return
      }

      // Nettoyage final
      const pseudoClean = normalizeSpaces(pseudo || '')

      const payload = {
        pseudo: pseudoClean === '' ? null : pseudoClean,
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 handleSave - Payload nettoyé', payload)
      }

      // 1. Mise à jour metadata Auth
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          pseudo: payload.pseudo,
        },
      })
      if (metaError) {
        console.warn('⚠️ Mise à jour metadata échouée :', metaError)
        showToast(t('profil.profileUpdateError'), 'error')
        console.error('❌ Erreur sauvegarde profil:', metaError)
      } else {
        setPseudo(payload.pseudo || '')

        showToast(t('profil.profileUpdated'), 'success')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user) return

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 handleAvatarUpload - Début upload', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      })
    }

    const previousAvatar = user.user_metadata?.avatar
    // Chemin RLS-compatible : {userId}/avatars/{UUID}.jpg
    const fileName = buildRLSPath(user.id, file.name, 'avatars')

    if (previousAvatar) {
      const { error: deleteError } = await supabase.storage
        .from('personal-images')
        .remove([previousAvatar])
      if (deleteError)
        console.warn('⚠️ Suppression ancien avatar :', deleteError)
      await wait(200)
    }

    const { data, error: uploadError } = await supabase.storage
      .from('personal-images')
      .upload(fileName, file, {
        upsert: true,
      })

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 handleAvatarUpload - Résultat upload', {
        fileName,
        data,
        uploadError,
        path: data?.path,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorCode: (uploadError as any)?.statusCode,
        errorMessage: uploadError?.message,
      })
    }

    if (uploadError) {
      showToast('❌ Upload échoué', 'error')
      console.error('❌ Erreur upload avatar:', uploadError)
      return
    }

    if (!data || !data.path) {
      showToast('❌ Upload échoué: données invalides', 'error')
      console.error('❌ Données upload invalides:', { data, uploadError })
      return
    }

    // Attendre un peu pour que le fichier soit disponible dans Storage
    await wait(300)

    // Mettre à jour l'état local immédiatement pour afficher le nouvel avatar
    setTempAvatarPath(data.path)
    // Forcer le re-render du composant AvatarProfil pour réinitialiser SignedImage
    setAvatarKey(k => k + 1)

    const { error: metaError } = await supabase.auth.updateUser({
      data: { avatar: data.path },
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 handleAvatarUpload - Mise à jour metadata', {
        metaError,
        avatarPath: data.path,
      })
    }

    if (metaError) {
      showToast(t('profil.profileUpdateError'), 'error')
      console.error('❌ Erreur mise à jour profil:', metaError)
      setTempAvatarPath(null) // Réinitialiser en cas d'erreur
    } else {
      showToast(t('profil.avatarUpdated'), 'success')
      // Plus besoin de recharger la page, l'avatar s'affiche déjà via tempAvatarPath
    }
  }

  const handleAvatarDelete = async () => {
    if (!user) return
    const avatarPath = user.user_metadata?.avatar
    if (!avatarPath) return
    const { error: deleteError } = await supabase.storage
      .from('personal-images')
      .remove([avatarPath])
    if (deleteError) {
      showToast('❌ Erreur suppression', 'error')
      return
    }
    const { error: metaError } = await supabase.auth.updateUser({
      data: { avatar: null },
    })
    if (metaError) showToast(t('profil.profileUpdateError'), 'error')
    else {
      setTempAvatarPath(null) // Réinitialiser l'état local
      setAvatarKey(k => k + 1) // Forcer le re-render
      showToast(t('profil.avatarDeleted'), 'success')
      // Plus besoin de recharger la page
    }
  }

  const resetPassword = async () => {
    if (!user) return
    try {
      if (!captchaTokenReset) {
        showToast(t('profil.validateCaptcha'), 'error')
        return
      }
      if (!user?.email) return

      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(
        user.email || '',
        {
          redirectTo,
          captchaToken: captchaTokenReset,
        }
      )
      if (error) throw error
      showToast(t('profil.resetEmailSent'), 'success')
    } catch (err) {
      console.error('Erreur reset mdp :', err)
      const errorMessage = (err as Error)?.message || ''

      // Gestion spécifique de l'erreur de rate limiting
      if (errorMessage.includes('you can only request this after')) {
        showToast(
          'Pour des raisons de sécurité, veuillez patienter avant de demander un nouveau lien.',
          'error'
        )
      } else {
        showToast(errorMessage || t('errors.generic'), 'error')
      }
    } finally {
      setCaptchaTokenReset(null)
      setCaptchaKey(k => k + 1)
    }
  }

  const handleDeleteAccount = async (turnstileToken: string) => {
    const { error } = await supabase.functions.invoke('delete-account', {
      body: { turnstile: turnstileToken },
    })
    if (error) {
      showToast(t('profil.accountDeleteError'), 'error')
    } else {
      showToast(t('profil.accountDeleted'), 'success')
      await signOut()
      router.push('/signup')
    }
  }

  if (!user) {
    return (
      <div className="profil-page">
        <h1>{t('profil.myProfile')}</h1>
        <p>{t('profil.loading')}</p>
      </div>
    )
  }

  return (
    <div className="profil-page">
      <header className="profil-page__header">
        <h1 className="profil-page__title">{t('profil.myProfile')}</h1>
        <FloatingPencil className="floating-pencil--profil" />
      </header>

      {/* CARD 1: Avatar & Identité */}
      <section className="profil-card profil-card--identity">
        <div className="profil-card__avatar-wrapper">
          <AvatarProfil
            key={avatarKey}
            avatarPath={tempAvatarPath || user.user_metadata?.avatar || null}
            pseudo={displayPseudo}
            onUpload={handleAvatarUpload}
            onDelete={() => setConfirmDeleteAvatar(true)}
          />
          <h2 className="profil-card__display-name">{displayPseudo}</h2>

          {/* Badge statut abonnement */}
          {loading ? (
            <div className="subscription-badge subscription-badge--loading">
              <span className="subscription-badge__icon">⏳</span>
              <span className="subscription-badge__text">
                {t('profil.loading')}
              </span>
            </div>
          ) : isActive ? (
            <div className="subscription-badge subscription-badge--active">
              <span className="subscription-badge__icon">✅</span>
              <span className="subscription-badge__text">
                {statusDisplay.label}
              </span>
            </div>
          ) : (
            <div className="subscription-badge subscription-badge--inactive">
              <span className="subscription-badge__icon">⭕</span>
              <span className="subscription-badge__text">
                {statusDisplay.label}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="profil-card__form">
          <InputWithValidation
            id="pseudo"
            label={t('profil.pseudo')}
            value={pseudo}
            rules={[noEdgeSpaces, noDoubleSpaces, validatePseudoMaxLength]}
            onChange={val => setPseudo(val)}
            onValid={val => setPseudo(normalizeSpaces(val))}
            ariaLabel={t('profil.pseudo')}
            placeholder="ex. Alex"
          />

          <div className="profil-card__email-display">
            <span className="profil-card__email-label">
              {t('profil.email')}
            </span>
            <span className="profil-card__email-value">{user.email}</span>
          </div>

          <Button
            type="submit"
            label={isSaving ? t('app.loading') : t('profil.save')}
            variant="primary"
            disabled={isSaving}
            className="profil-card__save-btn"
          />
        </form>
      </section>

      {/* CARD 2: Profils enfants */}
      <section className="profil-card profil-card--children">
        <h2 className="profil-card__title">
          <span className="profil-card__icon" aria-hidden="true">
            👶
          </span>
          Profils enfants
        </h2>
        <div className="profil-card__content">
          <ChildProfileSelector
            showCreateButton={true}
            showProfilesList={false}
          />
          <ChildProfileManager />
        </div>
      </section>

      {/* CARD 3 : Mes appareils (S10 — lifecycle devices) ─────────────────────
           Affiche la liste des appareils du compte avec révocation inline.
           ⚠️ Adulte uniquement — jamais en Contexte Tableau (§6.2).
           ⚠️ Message quota contractuel : « Nombre maximum d'appareils atteint. »
      ── */}
      <section className="profil-card profil-card--devices">
        <h2 className="profil-card__title">
          <span className="profil-card__icon" aria-hidden="true">
            📱
          </span>
          Mes appareils
        </h2>
        <div className="profil-card__content">
          <p className="profil-card__description">
            Gérez les appareils autorisés à accéder à votre compte. La
            révocation d&apos;un appareil est immédiate et non réversible.
          </p>
          <DeviceList currentDeviceId={deviceId} />
        </div>
      </section>

      {/* CARD 4: Sécurité */}
      <section className="profil-card profil-card--security">
        <h2 className="profil-card__title">
          <span className="profil-card__icon">🔒</span>
          Sécurité du compte
        </h2>

        <div className="profil-card__content">
          <Turnstile
            key={captchaKey}
            sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
            onSuccess={token => setCaptchaTokenReset(token)}
            onExpire={() => setCaptchaTokenReset(null)}
            theme="light"
            language={i18n.language}
          />

          <Button
            type="button"
            label={t('profil.resetPassword')}
            onClick={resetPassword}
            variant="secondary"
            className="profil-card__action-btn"
          />
        </div>
      </section>

      {/* CARD 3: Abonnement */}
      {!loading && isActive && (
        <section className="profil-card profil-card--subscription">
          <h2 className="profil-card__title">
            <span className="profil-card__icon">💳</span>
            Mon abonnement
          </h2>

          <div className="profil-card__content">
            <div className="subscription-details">
              <p className="subscription-details__status">
                Statut : <strong>{status}</strong>
              </p>
            </div>

            <Button
              type="button"
              label={t('profil.manageSubscription')}
              onClick={() => router.push('/abonnement')}
              variant="primary"
              className="profil-card__action-btn"
            />
          </div>
        </section>
      )}

      {/* CARD 4: Zone dangereuse */}
      <section className="profil-card profil-card--danger">
        <h2 className="profil-card__title">
          <span className="profil-card__icon">⚠️</span>
          Zone dangereuse
        </h2>

        <div className="profil-card__content">
          <p className="profil-card__warning-text">
            La suppression de votre compte est irréversible. Toutes vos données
            seront définitivement perdues.
          </p>

          <Button
            type="button"
            label={t('profil.deleteAccount')}
            onClick={() => setModalOpen(true)}
            variant="default"
            className="profil-card__delete-btn"
          />
        </div>
      </section>

      <DeleteAccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
      <ModalConfirm
        isOpen={confirmDeleteAvatar}
        onClose={() => setConfirmDeleteAvatar(false)}
        confirmLabel={t('profil.deleteAccountConfirm')}
        cancelLabel={t('profil.deleteAccountCancel')}
        onConfirm={() => {
          handleAvatarDelete()
          setConfirmDeleteAvatar(false)
        }}
      >
        ❗ {t('profil.deleteAvatarConfirm')}
      </ModalConfirm>
    </div>
  )
}
