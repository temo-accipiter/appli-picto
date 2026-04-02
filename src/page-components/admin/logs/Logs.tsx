'use client'

// src/page-components/admin/logs/Logs.tsx
/**
 * Page admin : Logs d'abonnement.
 *
 * Règles S12 §8.10 :
 * - Guard déjà appliqué par AdminRoute (404 neutre, sans hint)
 * - Scope lecture : subscription_logs uniquement (RLS is_admin())
 * - Pas de redirect, pas de toast "accès refusé"
 * - DB-first : utilise useSubscriptionLogs (pas de requête directe)
 */
import { Button, FloatingPencil } from '@/components'
import { useSubscriptionLogs } from '@/hooks'
import type { LogFilterType } from '@/hooks'
import { useRouter } from 'next/navigation'
import './Logs.scss'

// Labels des filtres
const FILTER_LABELS: Record<LogFilterType, string> = {
  all: 'Tous',
  user: 'Utilisateurs',
  system: 'Système',
  'event:webhook': 'Webhooks',
  'event:checkout': 'Checkout',
}

const ALL_FILTERS: LogFilterType[] = [
  'all',
  'user',
  'system',
  'event:webhook',
  'event:checkout',
]

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatEventType(eventType: string): string {
  return eventType
    .replace(/\./g, ' → ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

function getUserInfo(userId: string | null): string {
  if (!userId) return 'Système'
  return userId.slice(0, 8) + '...'
}

export default function Logs() {
  const router = useRouter()
  const {
    logs,
    loading,
    error,
    totalCount,
    hasMore,
    filter,
    setFilter,
    loadMore,
    refresh,
  } = useSubscriptionLogs()

  return (
    <div className="logs-page">
      <h1>Logs d&apos;abonnement</h1>

      <FloatingPencil className="floating-pencil--logs" />

      {/* Filtres */}
      <div className="logs-filters">
        <h3>Filtres</h3>
        <div className="filter-buttons">
          {ALL_FILTERS.map(f => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              label={FILTER_LABELS[f]}
              variant={filter === f ? 'primary' : 'secondary'}
            />
          ))}
        </div>

        <div className="filter-info">
          <p>Total : {totalCount} logs</p>
          <Button
            onClick={refresh}
            label="🔄 Actualiser"
            variant="secondary"
            disabled={loading}
          />
        </div>
      </div>

      {/* Liste des logs */}
      <div className="logs-list">
        <h3>Logs récents</h3>

        {error && !loading && <p className="no-logs">{error}</p>}

        {logs.length === 0 && !loading && !error && (
          <p className="no-logs">Aucun log trouvé</p>
        )}

        {logs.length > 0 && (
          <div className="logs-table">
            <div className="logs-header">
              <span>Timestamp</span>
              <span>Utilisateur</span>
              <span>Événement</span>
              <span>Détails</span>
            </div>

            {logs.map(log => (
              <div key={log.id} className="log-row">
                <span className="log-timestamp" data-label="Timestamp">
                  {formatTimestamp(log.created_at)}
                </span>
                <span className="log-user" data-label="Utilisateur">
                  {getUserInfo(log.account_id)}
                </span>
                <span className="log-event" data-label="Événement">
                  {formatEventType(log.event_type)}
                </span>
                <span className="log-details" data-label="Détails">
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </span>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="load-more">
            <Button
              onClick={loadMore}
              label={loading ? 'Chargement...' : 'Charger plus'}
              variant="secondary"
              disabled={loading}
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="logs-footer">
        <Button
          onClick={() => router.push('/profil')}
          label="← Retour au profil"
          variant="secondary"
        />
      </div>
    </div>
  )
}
