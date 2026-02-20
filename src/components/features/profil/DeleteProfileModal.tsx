'use client'

import { useState, useMemo } from 'react'
import { Modal, InputWithValidation } from '@/components'
import { useToast } from '@/contexts'
import { useI18n } from '@/hooks'
import { supabase } from '@/utils/supabaseClient'
import './DeleteProfileModal.scss'

interface DeleteProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (profileId: string) => Promise<void>
  profileName: string
  profileId: string
  avatarPath?: string | null
}

/**
 * Modal de suppression de profil enfant
 *
 * Fonctionnalités :
 * - Confirmation avec saisie "SUPPRIMER"
 * - Purge avatar Storage si existe
 * - Suppression profil (cascade DB gère données liées)
 * - Avertissement données supprimées
 *
 * Règles :
 * - TSA-friendly : message clair, confirmation explicite
 * - Purge avatar non-bloquante (continue même si échec)
 * - Cascade DB : tâches, progression, récompenses auto-supprimées
 *
 * @param isOpen - Modal ouverte
 * @param onClose - Fermer modal
 * @param onConfirm - Callback suppression (reçoit profileId)
 * @param profileName - Nom profil (affiché dans message)
 * @param profileId - ID profil à supprimer
 * @param avatarPath - Chemin avatar Storage (optionnel)
 */
export default function DeleteProfileModal({
  isOpen,
  onClose,
  onConfirm,
  profileName,
  profileId,
  avatarPath,
}: DeleteProfileModalProps) {
  const { t } = useI18n()
  const { show } = useToast()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  const deleteWord = 'SUPPRIMER'
  const canSubmit = useMemo(
    () => typed.trim().toUpperCase() === deleteWord && !busy,
    [typed, busy]
  )

  const handleConfirm = async () => {
    if (!canSubmit) return

    try {
      setBusy(true)

      // 1. Purger avatar Storage si existe (non-bloquant)
      if (avatarPath) {
        const { error: storageError } = await supabase.storage
          .from('avatars')
          .remove([avatarPath])

        if (storageError) {
          console.warn('Erreur suppression avatar:', storageError)
          // Non-bloquant : continuer même si échec
        }
      }

      // 2. Suppression profil (cascade DB gère tout)
      await onConfirm(profileId)

      show(t('profil.deleteProfileSuccess'), 'success')
      onClose()
    } catch (error) {
      console.error('Erreur suppression profil:', error)
      show(t('profil.deleteProfileError'), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profil.deleteProfileTitle')}
      actions={[
        {
          label: t('profil.deleteProfileCancel'),
          onClick: onClose,
          variant: 'secondary',
        },
        {
          label: busy
            ? t('profil.deleteProfileProcessing')
            : t('profil.deleteProfileConfirm'),
          onClick: handleConfirm,
          variant: 'danger',
          disabled: !canSubmit,
          autoFocus: true,
        },
      ]}
    >
      <div className="delete-profile-guard">
        <p className="delete-profile-guard__intro">
          Supprimer le profil <strong>{profileName}</strong> ?<br />
          Cette action est <strong>définitive</strong>.
        </p>

        <InputWithValidation
          id="delete-word"
          label={`Tapez "${deleteWord}" pour confirmer`}
          value={typed}
          onValid={setTyped}
          onChange={setTyped}
          rules={[
            v =>
              String(v).trim().toUpperCase() === deleteWord
                ? ''
                : `Tapez exactement "${deleteWord}"`,
          ]}
        />

        <div className="delete-profile-guard__warning">
          <p>⚠️ Toutes les données associées seront supprimées :</p>
          <ul>
            <li>Tâches personnalisées</li>
            <li>Progression</li>
            <li>Récompenses</li>
            <li>Avatar</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
