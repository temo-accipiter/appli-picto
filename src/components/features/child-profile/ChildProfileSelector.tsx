'use client'

/**
 * ChildProfileSelector — Sélecteur de profil enfant actif
 *
 * Mobile-first, TSA-friendly.
 *
 * Comportements :
 * - Affiche la liste des profils du compte.
 * - Profil actif : style distinct.
 * - Profil "locked" : désactivé + badge visuel neutre.
 * - Bouton "+" : ouvre un mini-formulaire de création inline.
 * - Création : DB-first, gère les refus DB proprement (message neutre).
 *
 * ⚠️ RÈGLES TSA
 * - Transitions douces ≤ 0.3s.
 * - Pas de flash visuel au changement de profil.
 * - Pas de jargon technique dans les messages.
 * - Cibles tactiles ≥ 44px.
 */

import { type FormEvent, useState } from 'react'
import { useChildProfile } from '@/contexts/ChildProfileContext'
import type { ChildProfile } from '@/hooks/useChildProfiles'
import './ChildProfileSelector.scss'

// ─── Sous-composant : carte d'un profil ───────────────────────────────────────

interface ProfileCardProps {
  profile: ChildProfile
  isActive: boolean
  onSelect: (id: string) => void
}

function ProfileCard({ profile, isActive, onSelect }: ProfileCardProps) {
  const isLocked = profile.status === 'locked'
  const initial = profile.name.charAt(0).toUpperCase()

  const classNames = [
    'child-profile-card',
    isActive ? 'child-profile-card--active' : '',
    isLocked ? 'child-profile-card--locked' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => !isLocked && onSelect(profile.id)}
      disabled={isLocked}
      aria-pressed={isActive}
      aria-label={
        isLocked
          ? `${profile.name} — verrouillé (lecture seule)`
          : `Sélectionner ${profile.name}`
      }
    >
      {/* Avatar lettre */}
      <span className="child-profile-card__avatar" aria-hidden="true">
        {initial}
      </span>

      {/* Nom */}
      <span className="child-profile-card__name">{profile.name}</span>

      {/* Badge verrouillé */}
      {isLocked && (
        <span
          className="child-profile-card__lock"
          aria-label="Verrouillé"
          role="img"
        >
          🔒
        </span>
      )}
    </button>
  )
}

// ─── Sous-composant : formulaire de création ──────────────────────────────────

interface CreateProfileFormProps {
  onClose: () => void
}

function CreateProfileForm({ onClose }: CreateProfileFormProps) {
  const { createChildProfile } = useChildProfile()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    // Validation formelle côté client (alignée sur les contraintes DB)
    if (trimmed.length > 50) {
      setErrorMsg('Le prénom ne doit pas dépasser 50 caractères.')
      return
    }
    if (/\s{2,}/.test(trimmed)) {
      setErrorMsg('Le prénom ne doit pas contenir de doubles espaces.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    const { error } = await createChildProfile(trimmed)

    setSubmitting(false)

    if (error) {
      setErrorMsg(error)
    } else {
      onClose()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="child-profile-create-form"
      aria-label="Créer un profil enfant"
    >
      <input
        type="text"
        className="child-profile-create-form__input"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Prénom de l'enfant"
        maxLength={50}
        autoFocus
        disabled={submitting}
        aria-label="Prénom de l'enfant"
        aria-required="true"
      />

      {errorMsg && (
        <p className="child-profile-create-form__error" role="alert">
          {errorMsg}
        </p>
      )}

      <div className="child-profile-create-form__actions">
        <button
          type="submit"
          className="child-profile-create-form__btn child-profile-create-form__btn--submit"
          disabled={submitting || !name.trim()}
          aria-busy={submitting}
        >
          {submitting ? 'Création…' : 'Créer'}
        </button>
        <button
          type="button"
          className="child-profile-create-form__btn child-profile-create-form__btn--cancel"
          onClick={onClose}
          disabled={submitting}
        >
          Annuler
        </button>
      </div>
    </form>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface ChildProfileSelectorProps {
  /** Afficher le bouton "+" pour créer un nouveau profil (adulte uniquement) */
  showCreateButton?: boolean
  /** Afficher la liste de sélection des profils (false = création seule) */
  showProfilesList?: boolean
}

export function ChildProfileSelector({
  showCreateButton = true,
  showProfilesList = true,
}: ChildProfileSelectorProps) {
  const { childProfiles, activeChildId, setActiveChildId, loading } =
    useChildProfile()
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Chargement : loader neutre accessible
  if (loading) {
    return (
      <div
        className="child-profile-selector"
        aria-busy="true"
        aria-label="Chargement des profils"
      >
        <div className="child-profile-selector__loading">
          <span className="child-profile-selector__dot" aria-hidden="true" />
          <span className="child-profile-selector__dot" aria-hidden="true" />
          <span className="child-profile-selector__dot" aria-hidden="true" />
          <span className="sr-only">Chargement en cours</span>
        </div>
      </div>
    )
  }

  // Aucun profil (transitoire, le trigger DB en crée un après signup)
  if (childProfiles.length === 0 && !showCreateForm) {
    return (
      <div className="child-profile-selector">
        {showCreateButton && (
          <button
            type="button"
            className="child-profile-selector__add-btn"
            onClick={() => setShowCreateForm(true)}
            aria-label="Ajouter un profil enfant"
          >
            + Ajouter un enfant
          </button>
        )}
      </div>
    )
  }

  if (!showProfilesList) {
    return (
      <div
        className="child-profile-selector"
        aria-label="Créer un profil enfant"
      >
        {showCreateButton && !showCreateForm && (
          <button
            type="button"
            className="child-profile-selector__add-btn"
            onClick={() => setShowCreateForm(true)}
            aria-label="Ajouter un profil enfant"
          >
            + Ajouter un enfant
          </button>
        )}
        {showCreateForm && (
          <CreateProfileForm onClose={() => setShowCreateForm(false)} />
        )}
      </div>
    )
  }

  return (
    <div
      className="child-profile-selector"
      role="group"
      aria-label="Choisir un profil enfant"
    >
      {/* Liste des profils */}
      <div className="child-profile-selector__list" role="list">
        {childProfiles.map(profile => (
          <div role="listitem" key={profile.id}>
            <ProfileCard
              profile={profile}
              isActive={profile.id === activeChildId}
              onSelect={setActiveChildId}
            />
          </div>
        ))}

        {/* Bouton "+" pour créer (si autorisé et formulaire fermé) */}
        {showCreateButton && !showCreateForm && (
          <button
            type="button"
            className="child-profile-selector__add-btn child-profile-selector__add-btn--icon"
            onClick={() => setShowCreateForm(true)}
            aria-label="Ajouter un profil enfant"
          >
            +
          </button>
        )}
      </div>

      {/* Formulaire de création inline */}
      {showCreateForm && (
        <CreateProfileForm onClose={() => setShowCreateForm(false)} />
      )}
    </div>
  )
}

export default ChildProfileSelector
