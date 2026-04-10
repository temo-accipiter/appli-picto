'use client'

// src/page-components/admin/metrics/Metrics.tsx
/**
 * Page admin : Métriques de support ciblé.
 *
 * Règles S12 §8.10 :
 * - Accès ciblé par account_id (jamais liste globale des comptes)
 * - Scope lecture : identité minimale + statut + compteurs (sans contenu)
 * - JAMAIS d'image_url personnelle (enforced par la RPC)
 * - Guard appliqué en amont par AdminRoute
 */
import { Button, Input } from '@/components'
import { useAdminSupportInfo } from '@/hooks'
import type { AdminSupportAccountInfo, AdminSupportChildProfile } from '@/hooks'
import { useRouter } from 'next/navigation'
import { type KeyboardEvent, useState } from 'react'
import './Metrics.scss'

// Validation basique UUID v4
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function BadgeStatut({ status }: { status: string }) {
  const variant =
    status === 'admin'
      ? 'admin'
      : status === 'subscriber'
        ? 'subscriber'
        : 'free'
  const labels: Record<string, string> = {
    admin: 'Admin',
    subscriber: 'Abonné',
    free: 'Gratuit',
  }
  return (
    <span className={`metrics-badge metrics-badge--${variant}`}>
      {labels[status] ?? status}
    </span>
  )
}

function SectionCompte({ data }: { data: AdminSupportAccountInfo }) {
  const { account } = data
  return (
    <div className="metrics-card">
      <h3>Compte</h3>
      <div className="metrics-field">
        <span className="metrics-field__key">ID</span>
        <span className="metrics-field__value">{account.account_id}</span>
      </div>
      <div className="metrics-field">
        <span className="metrics-field__key">Statut</span>
        <span className="metrics-field__value">
          <BadgeStatut status={account.status} />
        </span>
      </div>
      <div className="metrics-field">
        <span className="metrics-field__key">Fuseau horaire</span>
        <span className="metrics-field__value">
          {account.timezone ?? 'Non défini'}
        </span>
      </div>
      <div className="metrics-field">
        <span className="metrics-field__key">Créé le</span>
        <span className="metrics-field__value">
          {new Date(account.created_at).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>
    </div>
  )
}

function SectionAppareils({ data }: { data: AdminSupportAccountInfo }) {
  const { devices } = data
  return (
    <div className="metrics-card">
      <h3>Appareils</h3>
      <div className="metrics-counters">
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {devices.total_devices}
          </span>
          <span className="metrics-counter__label">Total</span>
        </div>
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {devices.active_devices}
          </span>
          <span className="metrics-counter__label">Actifs</span>
        </div>
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {devices.revoked_devices}
          </span>
          <span className="metrics-counter__label">Révoqués</span>
        </div>
      </div>
    </div>
  )
}

function SectionProfils({ data }: { data: AdminSupportAccountInfo }) {
  const { profiles } = data
  return (
    <div className="metrics-card">
      <h3>Profils enfants</h3>
      <div className="metrics-counters">
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {profiles.total_profiles}
          </span>
          <span className="metrics-counter__label">Total</span>
        </div>
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {profiles.active_profiles}
          </span>
          <span className="metrics-counter__label">Actifs</span>
        </div>
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {profiles.locked_profiles}
          </span>
          <span className="metrics-counter__label">Verrouillés</span>
        </div>
      </div>

      {profiles.profiles && profiles.profiles.length > 0 && (
        <div className="metrics-profiles-list">
          {profiles.profiles.map((p: AdminSupportChildProfile) => (
            <div key={p.profile_id} className="metrics-profile-item">
              <span className="metrics-profile-item__name">{p.name}</span>
              <span className="metrics-profile-item__status">{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionCartes({ data }: { data: AdminSupportAccountInfo }) {
  const { cards } = data
  return (
    <div className="metrics-card">
      <h3>Cartes personnelles</h3>
      <div className="metrics-counters">
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {cards.personal_cards_count}
          </span>
          <span className="metrics-counter__label">Total</span>
        </div>
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {cards.personal_cards_current_month}
          </span>
          <span className="metrics-counter__label">Ce mois</span>
        </div>
      </div>
    </div>
  )
}

function SectionSessions({ data }: { data: AdminSupportAccountInfo }) {
  const { sessions } = data
  return (
    <div className="metrics-card">
      <h3>Sessions</h3>
      <div className="metrics-counters">
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {sessions.total_sessions}
          </span>
          <span className="metrics-counter__label">Total</span>
        </div>
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {sessions.active_sessions}
          </span>
          <span className="metrics-counter__label">Actives</span>
        </div>
        <div className="metrics-counter">
          <span className="metrics-counter__value">
            {sessions.completed_sessions}
          </span>
          <span className="metrics-counter__label">Terminées</span>
        </div>
      </div>
    </div>
  )
}

export default function Metrics() {
  const router = useRouter()
  const {
    info,
    loading,
    error,
    fetch: fetchInfo,
    reset,
  } = useAdminSupportInfo()

  const [accountId, setAccountId] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSearch = async () => {
    const trimmed = accountId.trim()

    if (!trimmed) {
      setValidationError('Veuillez saisir un identifiant de compte.')
      return
    }

    if (!UUID_REGEX.test(trimmed)) {
      setValidationError(
        "Format invalide. L'identifiant doit être un UUID (ex: 550e8400-e29b-41d4-a716-446655440000)."
      )
      return
    }

    setValidationError(null)
    await fetchInfo(trimmed)
  }

  const handleReset = () => {
    setAccountId('')
    setValidationError(null)
    reset()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleSearch()
  }

  return (
    <div className="metrics-page">
      <h1>Support — Métriques compte</h1>

      {/* Formulaire de recherche */}
      <section className="metrics-search" aria-label="Recherche par compte">
        <h3>Rechercher un compte</h3>
        <p>
          Saisissez l&apos;identifiant unique (UUID) d&apos;un compte pour
          consulter ses métadonnées techniques. Aucune donnée personnelle ni
          image n&apos;est accessible.
        </p>
        <div className="metrics-search__form">
          <Input
            id="metrics-account-search"
            type="text"
            className="metrics-search__input"
            placeholder="550e8400-e29b-41d4-a716-446655440000"
            value={accountId}
            onChange={e => {
              setAccountId(e.target.value)
              setValidationError(null)
            }}
            onKeyDown={handleKeyDown}
            aria-label="Identifiant du compte (UUID)"
            aria-describedby={validationError ? 'search-error' : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            onClick={() => void handleSearch()}
            label="Rechercher"
            variant="primary"
            disabled={loading}
          />
          {info && (
            <Button
              onClick={handleReset}
              label="Effacer"
              variant="secondary"
              disabled={loading}
            />
          )}
        </div>
        {validationError && (
          <p id="search-error" className="metrics-search__error" role="alert">
            {validationError}
          </p>
        )}
      </section>

      {/* État de chargement */}
      {loading && (
        <p aria-live="polite" style={{ textAlign: 'center' }}>
          Chargement…
        </p>
      )}

      {/* Erreur API */}
      {!!error && !loading && (
        <p role="alert" className="metrics-search__error">
          Erreur lors de la récupération des données. Vérifiez que
          l&apos;identifiant correspond à un compte existant.
        </p>
      )}

      {/* Résultats */}
      {info && !loading && (
        <div className="metrics-result" aria-label="Résultats du compte">
          <SectionCompte data={info} />
          <SectionAppareils data={info} />
          <SectionProfils data={info} />
          <SectionCartes data={info} />
          <SectionSessions data={info} />
        </div>
      )}

      {/* Navigation */}
      <div className="metrics-footer">
        <Button
          onClick={() => router.push('/profil')}
          label="← Retour au profil"
          variant="secondary"
        />
      </div>
    </div>
  )
}
