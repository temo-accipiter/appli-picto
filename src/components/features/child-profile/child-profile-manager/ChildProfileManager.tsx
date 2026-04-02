'use client'

/**
 * ChildProfileManager — Gestion des profils enfants avec suppression (page Profil)
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
 * - CASCADE: timelines, slots, sessions, validations
 * - Images Storage purgées séparément (si implémenté)
 */

import { useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useChildProfile } from '@/contexts/ChildProfileContext'
import { useToast } from '@/contexts'
import { useOnlineStatus, useExecutionOnly } from '@/hooks'
import { ButtonDelete, ModalConfirm } from '@/components'
import type { ChildProfile } from '@/hooks/useChildProfiles'
import './ChildProfileManager.scss'

interface DeleteState {
  isOpen: boolean
  profile: ChildProfile | null
  loading: boolean
}

export function ChildProfileManager() {
  const { childProfiles, activeChildId, setActiveChildId, refetchProfiles } =
    useChildProfile()
  const { showToast } = useToast()
  const { isOnline } = useOnlineStatus()
  const { isExecutionOnly } = useExecutionOnly()

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
          'Impossible de supprimer le dernier profil enfant. Supprimez votre compte entier si vous souhaitez effacer toutes vos données.',
          'warning'
        )
        setDeleteState(prev => ({ ...prev, loading: false }))
        return
      }

      // DELETE child_profiles (CASCADE: timelines → slots → sessions)
      // .select('id') pour vérifier qu'une ligne a été supprimée (éviter succès fantômes RLS)
      const { data, error } = await supabase
        .from('child_profiles')
        .delete()
        .eq('id', profile.id)
        .select('id')

      if (error) {
        console.error('❌ [ChildProfileManager] Erreur suppression:', error)

        // Traduction erreur DB → message UX neutre
        let errorMessage =
          'Impossible de supprimer le profil. Réessayez plus tard.'

        // Trigger "min 1 profil" lève ERRCODE 23514 (CHECK_VIOLATION)
        if (
          error.code === '23514' ||
          error.message?.includes('child_profile_min_one_required') ||
          error.message?.includes('minimum')
        ) {
          errorMessage =
            'Au moins 1 profil enfant doit être conservé. Supprimez votre compte entier pour effacer toutes vos données.'
        }

        showToast(errorMessage, 'error')
        setDeleteState({ isOpen: false, profile: null, loading: false })
        return
      }

      // Vérifier qu'une ligne a été effectivement supprimée (pas succès fantôme RLS)
      if (!data || data.length !== 1) {
        console.error(
          '❌ [ChildProfileManager] Suppression silencieuse (RLS policy) - aucune ligne supprimée'
        )
        showToast(
          'Impossible de supprimer le profil. Vérifiez vos permissions.',
          'error'
        )
        setDeleteState({ isOpen: false, profile: null, loading: false })
        return
      }

      // ✅ Suppression réussie
      console.log('✅ [ChildProfileManager] Profil supprimé:', profile.id)

      // Fermer modale
      setDeleteState({ isOpen: false, profile: null, loading: false })

      // Toast succès
      showToast(`Profil "${profile.name}" supprimé avec succès`, 'success')

      // Refresh liste profils
      refetchProfiles()

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
        Aucun profil enfant. Créez-en un pour commencer.
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
                  {/* Nom profil */}
                  <div className="child-profile-manager__info">
                    <span className="child-profile-manager__name">
                      {profile.name}
                    </span>

                    {isActive && (
                      <span
                        className="child-profile-manager__badge"
                        aria-label="Profil actif"
                      >
                        Actif
                      </span>
                    )}

                    {isLocked && (
                      <span
                        className="child-profile-manager__badge child-profile-manager__badge--locked"
                        aria-label="Profil verrouillé"
                      >
                        🔒 Verrouillé
                      </span>
                    )}
                  </div>

                  {/* Bouton suppression */}
                  <ButtonDelete
                    onClick={() => handleOpenDeleteModal(profile)}
                    disabled={isLastProfile || isLocked}
                    aria-label={`Supprimer le profil ${profile.name}`}
                    title={
                      isLastProfile
                        ? 'Au moins 1 profil doit être conservé'
                        : isLocked
                          ? 'Profil verrouillé, suppression impossible'
                          : `Supprimer ${profile.name}`
                    }
                  />
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
          <h3 style={{ marginBottom: '1rem' }}>
            Supprimer le profil &quot;{deleteState.profile.name}&quot; ?
          </h3>
          <p>
            Cette action est <strong>irréversible</strong> et supprimera{' '}
            <strong>définitivement</strong> :
          </p>
          <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
            <li>La timeline de {deleteState.profile.name}</li>
            <li>Tous les slots (étapes et récompenses)</li>
            <li>Toutes les sessions en cours</li>
            <li>Tout l&apos;historique de progression</li>
          </ul>
          <p>
            <strong>Êtes-vous sûr de vouloir continuer ?</strong>
          </p>
          {deleteState.loading && (
            <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
              Suppression en cours...
            </p>
          )}
        </ModalConfirm>
      )}
    </>
  )
}

export default ChildProfileManager
