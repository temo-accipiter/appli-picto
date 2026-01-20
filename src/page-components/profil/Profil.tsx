'use client'

// src/pages/profil/Profil.tsx
import {
  AvatarProfil,
  Button,
  DeleteAccountModal,
  FloatingPencil,
  Input,
  InputWithValidation,
  ModalConfirm,
} from '@/components'
import { useToast } from '@/contexts'
import { useAuth, useI18n, useSubscriptionStatus } from '@/hooks'
import {
  getDisplayPseudo,
  makeNoDoubleSpaces,
  makeNoEdgeSpaces,
  normalizeSpaces,
  supabase,
} from '@/utils'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Turnstile from 'react-turnstile'
import i18n from '@/config/i18n/i18n'
import './Profil.scss'

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function Profil() {
  const { t } = useI18n()
  const { isActive, status, loading, daysUntilExpiry } = useSubscriptionStatus()

  const { user, signOut } = useAuth()
  const { show: showToast } = useToast()
  const router = useRouter()

  const [pseudo, setPseudo] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [ville, setVille] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDeleteAvatar, setConfirmDeleteAvatar] = useState(false)
  const [captchaTokenReset, setCaptchaTokenReset] = useState<string | null>(
    null
  )
  const [captchaKey, setCaptchaKey] = useState(0)
  const [_isAdmin, setIsAdmin] = useState(false)
  const [tempAvatarPath, setTempAvatarPath] = useState<string | null>(null)
  const [avatarKey, setAvatarKey] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // même logique d'affichage que le UserMenu (DB > metadata > email)
  const displayPseudo = getDisplayPseudo(user, pseudo)

  // Créer les fonctions de validation i18n avec useMemo
  const noEdgeSpaces = useMemo(() => makeNoEdgeSpaces(t), [t])
  const noDoubleSpaces = useMemo(() => makeNoDoubleSpaces(t), [t])

  useEffect(() => {
    if (!user) return

    const checkAndInsertProfile = async () => {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('pseudo, date_naissance, ville, is_admin')
        .eq('id', user.id)
        .maybeSingle()

      if (error?.code === 'PGRST116' || status === 406 || !data) {
        const pseudoSignup =
          user.user_metadata?.pseudo ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Utilisateur'

        // Note: plan_id sera assigné automatiquement par le trigger assign_default_plan
        // @ts-expect-error - plan_id sera ajouté par le trigger SQL
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          pseudo: pseudoSignup,
          date_naissance: null,
          ville: null,
        })

        if (!insertError) setPseudo(pseudoSignup)
        return
      }

      if (!error && data) {
        setPseudo(data.pseudo || '')
        setDateNaissance(data.date_naissance || '')
        setVille(data.ville || '')
        setIsAdmin(data.is_admin || false)
      }
    }

    checkAndInsertProfile()
  }, [user, showToast])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isSaving) return

    setIsSaving(true)

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 handleSave - Début sauvegarde profil', {
          pseudo,
          dateNaissance,
          ville,
        })
      }

      // Bloque si règle violée
      const pseudoMsg = noEdgeSpaces(pseudo) || noDoubleSpaces(pseudo)
      const villeMsg = noEdgeSpaces(ville) || noDoubleSpaces(ville)
      if (pseudoMsg || villeMsg) {
        showToast(t('profil.fixFieldErrors'), 'error')
        return
      }

      // Nettoyage final
      const pseudoClean = normalizeSpaces(pseudo || '')
      const villeClean = normalizeSpaces(ville || '')

      const payload = {
        pseudo: pseudoClean === '' ? null : pseudoClean,
        ville: villeClean === '' ? null : villeClean,
        date_naissance:
          (dateNaissance || '').trim() === '' ? null : dateNaissance,
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 handleSave - Payload nettoyé', payload)
      }

      // 1. Mise à jour metadata Auth
      const { error: metaError } = await supabase.auth.updateUser({
        data: { pseudo: payload.pseudo },
      })
      if (metaError)
        console.warn('⚠️ Mise à jour metadata échouée :', metaError)

      if (!user?.id) {
        console.error('❌ [PROFIL UPDATE] user.id est undefined !')
        return
      }

      // DIAGNOSTIC AVANT UPDATE
      console.log('🔍 [PROFIL UPDATE] AVANT UPDATE:', {
        userId: user.id,
        payload,
        userEmail: user.email,
      })

      // Vérifier si le profil existe
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, pseudo, plan_id')
        .eq('id', user.id)
        .maybeSingle()

      console.log('🔍 [PROFIL UPDATE] PROFIL EXISTANT ?', {
        exists: !!existingProfile,
        profile: existingProfile,
        checkError,
      })

      if (!existingProfile) {
        console.error(
          '❌ [PROFIL UPDATE] Profil inexistant pour user.id:',
          user.id
        )
        showToast('Erreur: votre profil est introuvable', 'error')
        return
      }

      // 2. Mise à jour table profiles
      const { error, data, status, statusText, count } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select()

      // LOGGING ULTRA-DÉTAILLÉ (TOUJOURS ACTIF pour debug)
      console.log('🔍 [PROFIL UPDATE] RÉSULTAT COMPLET:', {
        status,
        statusText,
        count,
        hasError: !!error,
        errorIsObject: typeof error === 'object',
        errorIsNull: error === null,
        errorKeys: error ? Object.keys(error) : 'error is null',
        errorEntries: error ? Object.entries(error) : 'error is null',
        hasData: !!data,
        dataIsArray: Array.isArray(data),
        dataLength: data?.length,
        data,
        error,
        rawError: JSON.stringify(error),
      })

      // Pattern robuste: vérifier PLUSIEURS conditions
      const hasRealError =
        status >= 400 || // HTTP error
        (error && error !== null && Object.keys(error).length > 0) || // Error object avec clés
        !data ||
        data.length === 0 // Aucune ligne mise à jour

      console.log('🔍 [PROFIL UPDATE] ANALYSE ERREUR:', {
        hasRealError,
        statusCheck: status >= 400,
        errorCheck: error && error !== null && Object.keys(error).length > 0,
        dataCheck: !data || data.length === 0,
      })

      if (hasRealError) {
        const errorMsg =
          error?.message ||
          error?.details ||
          (data?.length === 0 ? 'Aucune ligne mise à jour' : '') ||
          `Update échoué (HTTP ${status})`

        console.error('❌ [PROFIL UPDATE] ERREUR DÉTECTÉE:', {
          status,
          statusText,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          dataLength: data?.length,
          errorMsg,
          fullError: error,
          fullData: data,
        })
        showToast(t('profil.profileUpdateError'), 'error')
      } else {
        // 3. IMPORTANT: Mettre à jour l'état local avec les valeurs nettoyées
        // Cela suffit pour mettre à jour l'UI car getDisplayPseudo() utilise dbPseudo en priorité
        setPseudo(payload.pseudo || '')
        setVille(payload.ville || '')
        setDateNaissance(payload.date_naissance || '')

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
    const fileName = `${user.id}/${Date.now()}-${file.name}`

    if (previousAvatar) {
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([previousAvatar])
      if (deleteError)
        console.warn('⚠️ Suppression ancien avatar :', deleteError)
      await wait(200)
    }

    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true, // Écrase le fichier s'il existe déjà
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

    // 🔴 FIX: Gestion d'erreur manquante pour update profiles
    const {
      error: profileError,
      status: profileStatus,
      data: profileData,
    } = await supabase
      .from('profiles')
      .update({ avatar_url: data.path })
      .eq('id', user.id)
      .select()

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 handleAvatarUpload - Mise à jour metadata/profil', {
        metaError,
        avatarPath: data.path,
        profileStatus,
        profileError,
        profileData,
      })
    }

    // Vérifier BOTH metadata error ET profile error
    const hasProfileError =
      profileStatus >= 400 ||
      (profileError && Object.keys(profileError).length > 0)

    if (metaError || hasProfileError) {
      const errorMsg = metaError?.message || profileError?.message || 'Erreur'
      showToast(t('profil.profileUpdateError'), 'error')
      console.error('❌ Erreur mise à jour avatar:', {
        metaError,
        profileError,
        profileStatus,
        errorMsg,
      })
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
      .from('avatars')
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
                {status}
                {typeof daysUntilExpiry === 'number' && daysUntilExpiry >= 0
                  ? ` · ${daysUntilExpiry}j`
                  : ''}
              </span>
            </div>
          ) : (
            <div className="subscription-badge subscription-badge--inactive">
              <span className="subscription-badge__icon">⭕</span>
              <span className="subscription-badge__text">Free</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="profil-card__form">
          <InputWithValidation
            id="pseudo"
            label={t('profil.pseudo')}
            value={pseudo}
            rules={[noEdgeSpaces, noDoubleSpaces]}
            onChange={val => setPseudo(val)}
            onValid={val => setPseudo(normalizeSpaces(val))}
            ariaLabel={t('profil.pseudo')}
            placeholder="ex. Alex"
          />

          <Input
            id="date-naissance"
            label={t('profil.birthdate')}
            type="date"
            value={dateNaissance}
            onChange={e => setDateNaissance(e.target.value)}
          />

          <InputWithValidation
            id="ville"
            label={t('profil.city')}
            value={ville}
            rules={[noEdgeSpaces, noDoubleSpaces]}
            onChange={val => setVille(val)}
            onValid={val => setVille(normalizeSpaces(val))}
            ariaLabel={t('profil.city')}
            placeholder="ex. Paris"
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

      {/* CARD 2: Sécurité */}
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
              {typeof daysUntilExpiry === 'number' && daysUntilExpiry >= 0 && (
                <p className="subscription-details__expiry">
                  Expire dans : <strong>{daysUntilExpiry} jours</strong>
                </p>
              )}
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
