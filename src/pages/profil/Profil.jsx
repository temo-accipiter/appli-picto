import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useSubscriptionStatus } from '@/hooks'
import { useToast } from '@/contexts'
import {
  supabase,
  getDisplayPseudo,
  noEdgeSpaces,
  noDoubleSpaces,
  normalizeSpaces,
} from '@/utils'
import {
  Input,
  Button,
  FloatingPencil,
  ModalConfirm,
  AvatarProfil,
  SubscribeButton,
  InputWithValidation,
} from '@/components'
import './Profil.scss'

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function Profil() {
  const { isActive, status, loading } = useSubscriptionStatus()

  const { user, signOut } = useAuth()
  const { show: showToast } = useToast()
  const navigate = useNavigate()

  const [pseudo, setPseudo] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [ville, setVille] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDeleteAvatar, setConfirmDeleteAvatar] = useState(false)
  const displayPseudo = getDisplayPseudo(user, pseudo)
  useEffect(() => {
    console.log('📌 Profil monté')

    if (!user) {
      console.log('⛔ Aucun utilisateur détecté')
      return
    }

    console.log('👤 Utilisateur connecté :', user.id)

    const checkAndInsertProfile = async () => {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('pseudo, date_naissance, ville')
        .eq('id', user.id)
        .maybeSingle()

      console.log(
        '📥 Résultat fetch profile =',
        data,
        'status =',
        status,
        'error =',
        error
      )

      if (error?.code === 'PGRST116' || status === 406 || !data) {
        console.log('⚠️ Aucune ligne profile trouvée → tentative d’insertion…')

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

        if (insertError?.code === '23505') {
          console.warn('⚠️ Profil déjà existant, insertion ignorée.')
        } else if (insertError) {
          console.error('❌ Erreur création profil :', insertError)
          showToast('Erreur lors de la création du profil', 'error')
        } else {
          console.log('✅ Profil inséré avec succès')
          setPseudo(pseudoSignup)
        }

        return
      }

      if (error) {
        console.error('Erreur chargement infos :', error)
        return
      }

      console.log('✅ Profil chargé :', data)
      setPseudo(data.pseudo || '')
      setDateNaissance(data.date_naissance || '')
      setVille(data.ville || '')
    }

    checkAndInsertProfile()
  }, [user, showToast])

  const handleSave = async e => {
    e.preventDefault()

    const pseudoClean = normalizeSpaces(pseudo || '')
    const villeClean = normalizeSpaces(ville || '')

    const payload = {
      // ✅ si vide → NULL en base
      pseudo: pseudoClean === '' ? null : pseudoClean,
      ville: villeClean === '' ? null : villeClean,
      date_naissance:
        (dateNaissance || '').trim() === '' ? null : dateNaissance,
    }

    // ✅ aussi synchroniser la metadata auth (pour UserMenu, etc.)
    const { error: metaError } = await supabase.auth.updateUser({
      data: { pseudo: payload.pseudo },
    })
    if (metaError) {
      console.warn('⚠️ Mise à jour metadata échouée (non bloquant):', metaError)
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)

    if (error) {
      console.error('Erreur sauvegarde profil :', error)
      showToast('Erreur lors de la sauvegarde du profil', 'error')
    } else {
      showToast('Profil mis à jour', 'success')
    }
  }

  const handleAvatarUpload = async file => {
    if (!user) return

    const previousAvatar = user.user_metadata?.avatar
    const fileName = `${user.id}/${Date.now()}-${file.name}`

    if (previousAvatar) {
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([previousAvatar])

      if (deleteError) {
        console.warn('⚠️ Échec suppression ancien avatar :', deleteError)
      }
      await wait(200)
    }

    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Erreur upload avatar :', uploadError)
      showToast('❌ Upload échoué', 'error')
      return
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { avatar: data.path },
    })

    await supabase
      .from('profiles')
      .update({ avatar_url: data.path })
      .eq('id', user.id)

    if (metaError) {
      console.error('Erreur mise à jour metadata :', metaError)
      showToast('❌ Erreur profil', 'error')
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
      console.error('Erreur suppression avatar :', deleteError)
      showToast('❌ Erreur suppression', 'error')
      return
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { avatar: null },
    })
    if (metaError) {
      console.error('Erreur nettoyage profil :', metaError)
      showToast('❌ Erreur mise à jour', 'error')
    } else {
      showToast('✅ Avatar supprimé', 'success')
      window.location.reload()
    }
  }

  const resetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email)
    if (error) {
      console.error('Erreur reset mdp :', error)
      showToast("Erreur lors de l'envoi de l'email", 'error')
    } else {
      showToast('Email de réinitialisation envoyé', 'success')
    }
  }

  const handleDeleteAccount = async () => {
    const { data, error: sessionError } = await supabase.auth.getSession()
    const access_token = data?.session?.access_token

    if (!access_token) {
      console.error('⛔ Pas de token utilisateur')
      showToast('Utilisateur non connecté', 'error')
      return
    }

    console.log('🔐 Suppression via token :', access_token)

    const { error } = await supabase.functions.invoke('delete-account', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (error) {
      console.error('❌ Erreur suppression compte :', error)
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
          <p>Chargement de l’abonnement...</p>
        ) : isActive ? (
          <p className="abonnement-statut actif">
            ✅ Abonnement actif ({status})
          </p>
        ) : (
          <p className="abonnement-statut inactif">❌ Aucun abonnement actif</p>
        )}

        {!loading && !isActive && <SubscribeButton />}

        <div className="profil-buttons">
          <Button type="submit" label="Enregistrer" variant="primary" />
          <Button
            type="button"
            label="🔒 Réinitialiser mon mot de passe"
            onClick={resetPassword}
            variant="secondary"
          />
          <Button
            type="button"
            label="🗑 Supprimer mon compte"
            onClick={() => setModalOpen(true)}
            variant="default"
          />
        </div>
      </form>

      <ModalConfirm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        confirmLabel="Oui, supprimer"
        cancelLabel="Annuler"
        onConfirm={handleDeleteAccount}
      >
        ❗ Cette action supprimera définitivement ton compte et toutes tes
        données.
      </ModalConfirm>

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
