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
import { useAuth, useSubscriptionStatus } from '@/hooks'
import {
  getDisplayPseudo,
  noDoubleSpaces,
  noEdgeSpaces,
  normalizeSpaces,
  supabase,
} from '@/utils'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Turnstile from 'react-turnstile'
import './Profil.scss'

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function Profil() {
  const { isActive, status, loading, daysUntilExpiry } = useSubscriptionStatus()

  const { user, signOut } = useAuth()
  const { show: showToast } = useToast()
  const navigate = useNavigate()

  const [pseudo, setPseudo] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [ville, setVille] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDeleteAvatar, setConfirmDeleteAvatar] = useState(false)
  const [captchaTokenReset, setCaptchaTokenReset] = useState(null)
  const [captchaKey, setCaptchaKey] = useState(0)
  const [_isAdmin, setIsAdmin] = useState(false)

  // même logique d'affichage que le UserMenu (DB > metadata > email)
  const displayPseudo = getDisplayPseudo(user, pseudo)

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

  const handleSave = async e => {
    e.preventDefault()

    if (import.meta.env.DEV) {
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
      showToast("Corrige les champs en rouge avant d'enregistrer.", 'error')
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

    if (import.meta.env.DEV) {
      console.log('🔍 handleSave - Payload nettoyé', payload)
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { pseudo: payload.pseudo },
    })
    if (metaError) console.warn('⚠️ Mise à jour metadata échouée :', metaError)

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)

    if (import.meta.env.DEV) {
      console.log('🔍 handleSave - Résultat update profiles', { error })
    }

    if (error) {
      showToast('Erreur lors de la sauvegarde du profil', 'error')
      console.error('❌ Erreur sauvegarde profil:', error)
    } else {
      showToast('Profil mis à jour', 'success')
    }
  }

  const handleAvatarUpload = async file => {
    if (!user) return

    if (import.meta.env.DEV) {
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
      .upload(fileName, file)

    if (import.meta.env.DEV) {
      console.log('🔍 handleAvatarUpload - Résultat upload', {
        data,
        uploadError,
      })
    }

    if (uploadError) {
      showToast('❌ Upload échoué', 'error')
      console.error('❌ Erreur upload avatar:', uploadError)
      return
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { avatar: data.path },
    })
    await supabase
      .from('profiles')
      .update({ avatar_url: data.path })
      .eq('id', user.id)

    if (import.meta.env.DEV) {
      console.log('🔍 handleAvatarUpload - Mise à jour metadata/profil', {
        metaError,
      })
    }

    if (metaError) {
      showToast('❌ Erreur profil', 'error')
      console.error('❌ Erreur mise à jour profil:', metaError)
    } else {
      showToast('✅ Avatar mis à jour', 'success')
      window.location.reload()
    }
  }

  const handleAvatarDelete = async () => {
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
    if (metaError) showToast('❌ Erreur mise à jour', 'error')
    else {
      showToast('✅ Avatar supprimé', 'success')
      window.location.reload()
    }
  }

  const resetPassword = async () => {
    try {
      if (!captchaTokenReset) {
        showToast('Veuillez valider le CAPTCHA.', 'error')
        return
      }
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo,
        captchaToken: captchaTokenReset,
      })
      if (error) throw error
      showToast('Email de réinitialisation envoyé', 'success')
    } catch (err) {
      console.error('Erreur reset mdp :', err)
      showToast(err?.message || "Erreur lors de l'envoi de l'email", 'error')
    } finally {
      setCaptchaTokenReset(null)
      setCaptchaKey(k => k + 1)
    }
  }

  const handleDeleteAccount = async turnstileToken => {
    const { error } = await supabase.functions.invoke('delete-account', {
      body: { turnstile: turnstileToken },
    })
    if (error) {
      showToast('Erreur lors de la suppression du compte', 'error')
    } else {
      showToast('Compte supprimé avec succès', 'success')
      await signOut()
      navigate('/signup')
    }
  }

  if (!user) {
    return (
      <div className="profil-page">
        <h1>Mon profil</h1>
        <p>Chargement en cours...</p>
      </div>
    )
  }

  return (
    <div className="profil-page">
      <h1>Mon profil</h1>
      <FloatingPencil className="floating-pencil--profil" />
      <AvatarProfil
        avatarPath={user.user_metadata?.avatar || null}
        pseudo={displayPseudo}
        onUpload={handleAvatarUpload}
        onDelete={() => setConfirmDeleteAvatar(true)}
      />
      <form onSubmit={handleSave}>
        <InputWithValidation
          id="pseudo"
          label="Pseudo"
          value={pseudo}
          rules={[noEdgeSpaces, noDoubleSpaces]}
          onChange={val => setPseudo(val)}
          onValid={val => setPseudo(normalizeSpaces(val))}
          ariaLabel="Pseudo"
          placeholder="ex. Alex"
        />

        <Input
          id="date-naissance"
          label="Date de naissance"
          type="date"
          value={dateNaissance}
          onChange={e => setDateNaissance(e.target.value)}
        />

        <InputWithValidation
          id="ville"
          label="Ville"
          value={ville}
          rules={[noEdgeSpaces, noDoubleSpaces]}
          onChange={val => setVille(val)}
          onValid={val => setVille(normalizeSpaces(val))}
          ariaLabel="Ville"
          placeholder="ex. Paris"
        />

        <p>Email : {user.email}</p>

        {loading ? (
          <p>Chargement de l&apos;abonnement...</p>
        ) : isActive ? (
          <div className="abonnement-section">
            <p className="abonnement-statut actif">
              ✅ Abonnement actif ({status}
              {typeof daysUntilExpiry === 'number' && daysUntilExpiry >= 0
                ? ` · ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''} restants`
                : ''}
              ){' '}
            </p>
            <Button
              type="button"
              label="🔧 Gérer mon abonnement"
              onClick={() => navigate('/abonnement')}
              variant="primary"
            />
          </div>
        ) : (
          <p className="abonnement-statut inactif">❌ Aucun abonnement actif</p>
        )}

        {/* ⬇️ Bouton S’abonner retiré */}
        {/* {!loading && !isActive && <SubscribeButton />} */}

        <div className="profil-buttons">
          <Button type="submit" label="Enregistrer" variant="primary" />

          <Turnstile
            key={captchaKey}
            sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
            onSuccess={token => setCaptchaTokenReset(token)}
            onExpire={() => setCaptchaTokenReset(null)}
            options={{ refreshExpired: 'auto' }}
            theme="light"
          />

          <Button
            type="button"
            label="🔒 Réinitialiser mon mot de passe"
            onClick={resetPassword}
            variant="secondary"
            // disabled={!captchaTokenReset}
          />

          <Button
            type="button"
            label="🗑 Supprimer mon compte"
            onClick={() => setModalOpen(true)}
            variant="default"
          />
        </div>
      </form>

      <DeleteAccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
      <ModalConfirm
        isOpen={confirmDeleteAvatar}
        onClose={() => setConfirmDeleteAvatar(false)}
        confirmLabel="Oui, supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          handleAvatarDelete()
          setConfirmDeleteAvatar(false)
        }}
      >
        ❗ Supprimer l’avatar de ton profil ?
      </ModalConfirm>
    </div>
  )
}
