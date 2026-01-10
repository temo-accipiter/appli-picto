'use client'

/**
 * MetricsDashboard - Vue de synthèse des métriques clés
 *
 * Affiche un dashboard complet avec :
 * - Statistiques utilisateurs (total, nouveaux, actifs)
 * - Statistiques abonnements (actifs, revenus, taux de conversion)
 * - Métriques images (uploads, compression, stockage)
 * - Erreurs système (webhooks, images, quotas)
 * - Santé du système (uptime, latence, quotas)
 */

import { useState } from 'react'
import { useMetrics } from '@/hooks'
import { Loader } from '@/components'
import './MetricsDashboard.scss'

export default function MetricsDashboard() {
  const { metrics, loading, error } = useMetrics()
  const [lastUpdate] = useState<Date>(new Date())

  if (loading) {
    return (
      <div className="metrics-dashboard">
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="metrics-dashboard">
        <div className="metrics-dashboard__error">
          <p>❌ Erreur chargement métriques : {error}</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="metrics-dashboard">
        <p className="metrics-dashboard__empty">Aucune donnée disponible</p>
      </div>
    )
  }

  const getHealthColor = (score: number): string => {
    if (score >= 90) return 'good'
    if (score >= 70) return 'warning'
    return 'error'
  }

  return (
    <div className="metrics-dashboard">
      <div className="metrics-dashboard__header">
        <h1 className="metrics-dashboard__title">📊 Dashboard Monitoring</h1>
        <div className="metrics-dashboard__meta">
          <span className="last-update">
            Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Santé Système */}
      <section className="metrics-section metrics-section--health">
        <h2>🏥 Santé Système</h2>
        <div className="metrics-grid">
          <div
            className={`metric-card metric-card--${getHealthColor(metrics.health.score)}`}
          >
            <div className="metric-card__icon">💚</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Score de santé</div>
              <div className="metric-card__value">
                {metrics.health.score}%
              </div>
              <div className="metric-card__subtitle">
                {metrics.health.score >= 90
                  ? 'Excellent'
                  : metrics.health.score >= 70
                    ? 'Bon'
                    : 'À surveiller'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Utilisateurs */}
      <section className="metrics-section">
        <h2>👥 Utilisateurs</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-card__icon">👤</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Total</div>
              <div className="metric-card__value">{metrics.users.total}</div>
            </div>
          </div>

          <div className="metric-card metric-card--highlight">
            <div className="metric-card__icon">✨</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Nouveaux (7j)</div>
              <div className="metric-card__value">{metrics.users.new_7d}</div>
              <div className="metric-card__subtitle">
                +
                {metrics.users.total > 0
                  ? Math.round(
                      (metrics.users.new_7d / metrics.users.total) * 100
                    )
                  : 0}
                % de croissance
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__icon">🔥</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Actifs (7j)</div>
              <div className="metric-card__value">
                {metrics.users.active_7d}
              </div>
              <div className="metric-card__subtitle">
                {metrics.users.total > 0
                  ? Math.round(
                      (metrics.users.active_7d / metrics.users.total) * 100
                    )
                  : 0}
                % du total
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Abonnements */}
      <section className="metrics-section">
        <h2>💳 Abonnements</h2>
        <div className="metrics-grid">
          <div className="metric-card metric-card--good">
            <div className="metric-card__icon">✅</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Actifs</div>
              <div className="metric-card__value">
                {metrics.subscriptions.active}
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__icon">📈</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Nouveaux (7j)</div>
              <div className="metric-card__value">
                {metrics.subscriptions.new_7d}
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__icon">📉</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Annulés (7j)</div>
              <div className="metric-card__value">
                {metrics.subscriptions.cancelled_7d}
              </div>
              <div className="metric-card__subtitle">
                {metrics.subscriptions.active > 0
                  ? Math.round(
                      (metrics.subscriptions.cancelled_7d /
                        metrics.subscriptions.active) *
                        100
                    )
                  : 0}
                % churn
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="metrics-section">
        <h2>🖼️ Images</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-card__icon">📤</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Uploads (7j)</div>
              <div className="metric-card__value">
                {metrics.images.uploads_7d}
              </div>
            </div>
          </div>

          <div className="metric-card metric-card--good">
            <div className="metric-card__icon">✅</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Taux de succès</div>
              <div className="metric-card__value">
                {metrics.images.success_rate}%
              </div>
            </div>
          </div>

          <div className="metric-card metric-card--highlight">
            <div className="metric-card__icon">💾</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Stockage économisé</div>
              <div className="metric-card__value">
                {metrics.images.storage_saved_mb} MB
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Erreurs */}
      <section className="metrics-section">
        <h2>⚠️ Erreurs (7 derniers jours)</h2>
        <div className="metrics-grid">
          <div
            className={`metric-card ${metrics.errors.webhooks_7d > 0 ? 'metric-card--error' : ''}`}
          >
            <div className="metric-card__icon">🔗</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Erreurs Webhooks</div>
              <div className="metric-card__value">
                {metrics.errors.webhooks_7d}
              </div>
            </div>
          </div>

          <div
            className={`metric-card ${metrics.errors.images_7d > 0 ? 'metric-card--warning' : ''}`}
          >
            <div className="metric-card__icon">🖼️</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Erreurs Images</div>
              <div className="metric-card__value">
                {metrics.errors.images_7d}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
