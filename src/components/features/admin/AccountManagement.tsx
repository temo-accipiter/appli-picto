'use client'

// src/components/admin/AccountManagement.tsx
/**
 * Composant de support admin — lecture seule des comptes.
 *
 * Règles S12 §8.10 :
 * - Scope lecture : identité minimale + statut + compteurs
 * - JAMAIS d'image personnelle (avatar interdit §8.10 D2)
 * - Pas de "set account status manual" (interdit §8.10)
 * - Accès via admin_get_account_support_info (fonction SECURITY DEFINER)
 */
import { useAccountStatus } from '@/hooks'
import { useAdminSupportInfo } from '@/hooks'
import { useState } from 'react'
import './AccountManagement.scss'

interface AccountManagementProps {
  className?: string
}

export default function AccountManagement({
  className = '',
}: AccountManagementProps) {
  const { isAdmin } = useAccountStatus()
  const { info, loading, error, fetch: fetchInfo, reset } = useAdminSupportInfo()
  const [accountIdInput, setAccountIdInput] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!isAdmin) {
    return null
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = accountIdInput.trim()
    if (!trimmed) return

    setSubmitted(true)
    await fetchInfo(trimmed)
  }

  const handleReset = () => {
    setAccountIdInput('')
    setSubmitted(false)
    reset()
  }

  return (
    <div className={`account-management ${className}`}>
      <div className="account-header">
        <h2>Support Compte</h2>
        <p>Consultez les métadonnées d&apos;un compte spécifique (lecture seule).</p>
      </div>

      {/* Recherche par Account ID */}
      <form className="account-search" onSubmit={handleSearch}>
        <label htmlFor="account-id-input" className="account-search__label">
          Account ID (UUID)
        </label>
        <div className="account-search__row">
          <input
            id="account-id-input"
            type="text"
            className="account-search__input"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={accountIdInput}
            onChange={e => setAccountIdInput(e.target.value)}
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            aria-describedby="account-id-hint"
          />
          <button
            type="submit"
            className="account-search__submit"
            disabled={loading || !accountIdInput.trim()}
          >
            {loading ? 'Chargement…' : 'Consulter'}
          </button>
          {submitted && (
            <button
              type="button"
              className="account-search__reset"
              onClick={handleReset}
            >
              Effacer
            </button>
          )}
        </div>
        <p id="account-id-hint" className="account-search__hint">
          Saisir l&apos;UUID exact du compte (accès ciblé uniquement, pas de liste globale).
        </p>
      </form>

      {/* Erreur */}
      {error && submitted && (
        <div className="account-management__error" role="alert">
          <p>Compte introuvable ou accès refusé.</p>
        </div>
      )}

      {/* Résultats — métadonnées support */}
      {info && (
        <div className="account-info">
          {/* Statut compte */}
          <section className="account-info__section">
            <h3>Compte</h3>
            <dl className="account-info__list">
              <dt>ID</dt>
              <dd className="account-info__mono">{info.account.account_id}</dd>
              <dt>Statut</dt>
              <dd>
                <span className={`status-badge status-badge--${info.account.status}`}>
                  {info.account.status}
                </span>
              </dd>
              <dt>Fuseau horaire</dt>
              <dd>{info.account.timezone || '—'}</dd>
              <dt>Créé le</dt>
              <dd>{new Date(info.account.created_at).toLocaleDateString('fr-FR')}</dd>
            </dl>
          </section>

          {/* Appareils */}
          <section className="account-info__section">
            <h3>Appareils</h3>
            <dl className="account-info__list">
              <dt>Total</dt>
              <dd>{info.devices.total_devices}</dd>
              <dt>Actifs</dt>
              <dd>{info.devices.active_devices}</dd>
              <dt>Révoqués</dt>
              <dd>{info.devices.revoked_devices}</dd>
            </dl>
          </section>

          {/* Profils enfants */}
          <section className="account-info__section">
            <h3>Profils enfants</h3>
            <dl className="account-info__list">
              <dt>Total</dt>
              <dd>{info.profiles.total_profiles}</dd>
              <dt>Actifs</dt>
              <dd>{info.profiles.active_profiles}</dd>
              <dt>Verrouillés</dt>
              <dd>{info.profiles.locked_profiles}</dd>
            </dl>
            {info.profiles.profiles && info.profiles.profiles.length > 0 && (
              <ul className="account-info__profiles">
                {info.profiles.profiles.map(p => (
                  <li key={p.profile_id} className="account-info__profile">
                    <span className="account-info__mono">{p.profile_id.slice(0, 8)}…</span>
                    <span>{p.name}</span>
                    <span className={`status-badge status-badge--${p.status}`}>{p.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Cartes */}
          <section className="account-info__section">
            <h3>Cartes personnelles</h3>
            <dl className="account-info__list">
              <dt>Total</dt>
              <dd>{info.cards.personal_cards_count}</dd>
              <dt>Ce mois-ci</dt>
              <dd>{info.cards.personal_cards_current_month}</dd>
            </dl>
          </section>

          {/* Sessions */}
          <section className="account-info__section">
            <h3>Sessions</h3>
            <dl className="account-info__list">
              <dt>Total</dt>
              <dd>{info.sessions.total_sessions}</dd>
              <dt>Actives</dt>
              <dd>{info.sessions.active_sessions}</dd>
              <dt>Terminées</dt>
              <dd>{info.sessions.completed_sessions}</dd>
            </dl>
          </section>
        </div>
      )}
    </div>
  )
}
