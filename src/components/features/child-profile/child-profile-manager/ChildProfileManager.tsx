'use client'

/**
 * ChildProfileManager — Gestion des espaces enfants avec suppression (page Compte)
 *
 * Fonctionnalités :
 * - Liste des profils enfants avec bouton de suppression par profil
 * - Confirmation obligatoire avant suppression (TSA-friendly)
 * - Guards : offline, execution-only, dernier profil (au moins 1 obligatoire)
 * - Cascade DB : child_profiles → timelines → slots → sessions
 * - Synchronisation automatique après suppression
 *
 * ⚠️ RÈGLES
 * - Au moins 1 profil enfant obligatoire (invariant PLATFORM.md §2.7.2)
 * - Suppression irréversible → confirmation obligatoire
 * - Adulte uniquement (jamais en mode Tableau)
 *
 * ⚠️ RGPD (art. 17 — droit à l'effacement)
 * - Suppression individuelle autorisée
 * - CASCADE: timelines, slots, sessions, validations (géré par DB)
 * - Avatars enfants : non implémentés (child_profiles n'a pas de champ image).
 *   TODO : si un avatar est ajouté à child_profiles, ajouter une purge Storage
 *   best-effort ici avant le DELETE (chemin probable : {account_id}/children/{profile_id})
 */

import { useRef, useState } from 'react'
import { useChildProfile } from '@/contexts/ChildProfileContext'
import { useToast } from '@/contexts'
import { useOnlineStatus, useExecutionOnly } from '@/hooks'
import { ButtonDelete, ModalConfirm } from '@/components'
import { Pencil, Check, X } from 'lucide-react'
import type { ChildProfile } from '@/hooks/useChildProfiles'
import './ChildProfileManager.scss'

interface DeleteState {
  isOpen: boolean
  profile: ChildProfile | null
  loading: boolean
}

export function ChildProfileManager() {
  const {
    childProfiles,
    activeChildId,
    setActiveChildId,
    deleteChildProfile,
    updateChildProfile,
  } = useChildProfile()
  const { showToast } = useToast()
  const { isOnline } = useOnlineStatus()
  const { isExecutionOnly } = useExecutionOnly()

  // ── État édition inline ─────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  const handleStartEdit = (profile: ChildProfile) => {
    setEditingId(profile.id)
    setEditingName(profile.name)
    // Focus géré par autoFocus sur l'input
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async (profileId: string, originalName: string) => {
    const trimmed = editingName.trim()
    if (!trimmed || trimmed === originalName) {
      handleCancelEdit()
      return
    }
    setEditSaving(true)
    const { success, error } = await updateChildProfile(profileId, {
      name: trimmed,
    })
    setEditSaving(false)
    if (success) {
      showToast(`Espace renommé avec succès`, 'success')
      setEditingId(null)
    } else {
      showToast(error ?? "Impossible de renommer l'espace", 'error')
    }
  }

  const [deleteState, setDeleteState] = useState<DeleteState>({
    isOpen: false,
    profile: null,
    loading: false,
  })

  // ── Ouvrir modale confirmation ──────────────────────────────────────────────

  const handleOpenDeleteModal = (profile: ChildProfile) => {
    setDeleteState({
      isOpen: true,
      profile,
      loading: false,
    })
  }

  // ── Fermer modale ───────────────────────────────────────────────────────────

  const handleCloseDeleteModal = () => {
    if (deleteState.loading) return // Bloquer fermeture si suppression en cours

    setDeleteState({
      isOpen: false,
      profile: null,
      loading: false,
    })
  }

  // ── Suppression profil ──────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    const { profile } = deleteState

    if (!profile) return

    setDeleteState(prev => ({ ...prev, loading: true }))

    try {
      // Offline → interdire (modale déjà ouverte, feedback immédiat)
      if (!isOnline) {
        showToast('Indisponible hors connexion', 'warning')
        setDeleteState(prev => ({ ...prev, loading: false }))
        return
      }

      // Execution-only → interdire (modale déjà ouverte)
      if (isExecutionOnly) {
        showToast(
          "Mode exécution uniquement — l'édition de structure est désactivée",
          'warning'
        )
        setDeleteState(prev => ({ ...prev, loading: false }))
        return
      }

      // Dernier profil → guard UX + sécurité trigger DB
      if (childProfiles.length <= 1) {
        showToast(
          'Impossible de supprimer le dernier espace enfant. Supprimez votre compte entier si vous souhaitez effacer toutes vos données.',
          'warning'
        )
        setDeleteState(prev => ({ ...prev, loading: false }))
        return
      }

      // DELETE via hook DB-first (gestion erreurs dans useChildProfiles)
      const { success, error: deleteError } = await deleteChildProfile(
        profile.id
      )

      if (!success) {
        showToast(
          deleteError ??
            'Impossible de supprimer le profil. Réessayez plus tard.',
          'error'
        )
        setDeleteState({ isOpen: false, profile: null, loading: false })
        return
      }

      // ✅ Suppression réussie
      setDeleteState({ isOpen: false, profile: null, loading: false })
      showToast(`Espace "${profile.name}" supprimé avec succès`, 'success')

      // Le hook rafraîchit automatiquement via setFetchTick — refetchProfiles() n'est plus nécessaire

      // Si profil supprimé était actif → basculer vers un autre
      if (activeChildId === profile.id) {
        const remainingProfiles = childProfiles.filter(p => p.id !== profile.id)
        const activeProfiles = remainingProfiles.filter(
          p => p.status === 'active'
        )

        if (activeProfiles.length > 0) {
          // Sélectionner le premier profil actif restant
          setActiveChildId(activeProfiles[0]!.id)
        }
      }
    } catch (error) {
      console.error('❌ [ChildProfileManager] Erreur inattendue:', error)
      showToast('Une erreur inattendue est survenue', 'error')
      setDeleteState({ isOpen: false, profile: null, loading: false })
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (childProfiles.length === 0) {
    return (
      <p className="child-profile-manager__empty">
        Aucun espace enfant. Créez-en un pour commencer.
      </p>
    )
  }

  return (
    <>
      <div className="child-profile-manager">
        <ul className="child-profile-manager__list" role="list">
          {childProfiles.map(profile => {
            const isActive = profile.id === activeChildId
            const isLocked = profile.status === 'locked'
            const isLastProfile = childProfiles.length === 1

            return (
              <li
                key={profile.id}
                className="child-profile-manager__item"
                role="listitem"
              >
                <div className="child-profile-manager__card">
                  {editingId === profile.id ? (
                    // ── Mode édition inline ────────────────────────────────
                    <div className="child-profile-manager__edit">
                      <input
                        ref={editInputRef}
                        className="child-profile-manager__edit-input"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter')
                            void handleSaveEdit(profile.id, profile.name)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        maxLength={50}
                        autoFocus
                        disabled={editSaving}
                        aria-label={`Modifier le nom de l'espace ${profile.name}`}
                      />
                      <div className="child-profile-manager__edit-actions">
                        <button
                          type="button"
                          className="child-profile-manager__edit-btn child-profile-manager__edit-btn--save"
                          onClick={() =>
                            void handleSaveEdit(profile.id, profile.name)
                          }
                          disabled={editSaving || !editingName.trim()}
                          aria-label="Enregistrer le nouveau nom"
                        >
                          <Check size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="child-profile-manager__edit-btn child-profile-manager__edit-btn--cancel"
                          onClick={handleCancelEdit}
                          disabled={editSaving}
                          aria-label="Annuler la modification"
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── Mode affichage ─────────────────────────────────────
                    <>
                      <div className="child-profile-manager__info">
                        <span className="child-profile-manager__name">
                          {profile.name}
                        </span>

                        {isActive && (
                          <span
                            className="child-profile-manager__badge"
                            aria-label="Espace actif"
                          >
                            Actif
                          </span>
                        )}

                        {isLocked && (
                          <span
                            className="child-profile-manager__badge child-profile-manager__badge--locked"
                            aria-label="Espace verrouillé"
                          >
                            🔒 Verrouillé
                          </span>
                        )}
                      </div>

                      <div className="child-profile-manager__actions">
                        {/* Bouton édition */}
                        {!isLocked && (
                          <button
                            type="button"
                            className="child-profile-manager__edit-trigger"
                            onClick={() => handleStartEdit(profile)}
                            aria-label={`Renommer l'espace ${profile.name}`}
                            title={`Renommer ${profile.name}`}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                        )}

                        {/* Bouton suppression */}
                        <ButtonDelete
                          onClick={() => handleOpenDeleteModal(profile)}
                          disabled={isLastProfile || isLocked}
                          aria-label={`Supprimer l'espace ${profile.name}`}
                          title={
                            isLastProfile
                              ? 'Au moins 1 espace doit être conservé'
                              : isLocked
                                ? 'Espace verrouillé, suppression impossible'
                                : `Supprimer ${profile.name}`
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Modale confirmation suppression */}
      {deleteState.isOpen && deleteState.profile && (
        <ModalConfirm
          isOpen={deleteState.isOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          confirmLabel="Supprimer définitivement"
          confirmDisabled={deleteState.loading}
          closeOnConfirm={false}
        >
          <h3 className="child-profile-manager__modal-title">
            Supprimer l&apos;espace &quot;{deleteState.profile.name}&quot; ?
          </h3>
          <p>
            Cette action est <strong>irréversible</strong> et supprimera{' '}
            <strong>définitivement</strong> :
          </p>
          <ul className="child-profile-manager__modal-list">
            <li>La timeline de {deleteState.profile.name}</li>
            <li>Tous les slots (étapes et récompenses)</li>
            <li>Toutes les sessions en cours</li>
            <li>Tout l&apos;historique de progression</li>
          </ul>
          <p>
            <strong>Êtes-vous sûr de vouloir continuer ?</strong>
          </p>
          {deleteState.loading && (
            <p className="child-profile-manager__modal-loading">
              Suppression en cours...
            </p>
          )}
        </ModalConfirm>
      )}
    </>
  )
}

export default ChildProfileManager
