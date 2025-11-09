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

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { Loader } from '@/components'
import './MetricsDashboard.scss'

interface DashboardMetrics {
  users: {
    total: number
    new_7d: number
    active_7d: number
  }
  subscriptions: {
    active: number
    new_7d: number
    cancelled_7d: number
  }
  images: {
    uploads_7d: number
    success_rate: number
    storage_saved_mb: number
  }
  errors: {
    webhooks_7d: number
    images_7d: number
  }
  system: {
    health_score: number
    avg_response_time: number
  }
}

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchMetrics = async () => {
    try {
      setError(null)

      // Période: 7 derniers jours
      const weekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString()

      // Récupérer toutes les métriques en parallèle
      const [
        totalUsers,
        newUsers,
        activeTasks,
        activeSubscriptions,
        newSubscriptions,
        cancelledSubscriptions,
        imageStats,
        webhookErrors,
        imageErrors,
      ] = await Promise.all([
        // Total utilisateurs
        supabase.from('users').select('*', { count: 'exact', head: true }),

        // Nouveaux utilisateurs (7j)
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo),

        // Utilisateurs actifs (ayant créé une tâche dans les 7j)
        supabase.from('taches').select('user_id').gte('created_at', weekAgo),

        // Abonnements actifs
        supabase
          .from('abonnements')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),

        // Nouveaux abonnements (7j)
        supabase
          .from('subscription_logs')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'subscription.upserted')
          .gte('timestamp', weekAgo),

        // Abonnements annulés (7j)
        supabase
          .from('subscription_logs')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'webhook.customer.subscription.deleted')
          .gte('timestamp', weekAgo),

        // Stats images (7j)
        supabase.rpc('get_image_analytics_summary'),

        // Erreurs webhooks (7j)
        supabase
          .from('subscription_logs')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'webhook.error')
          .gte('timestamp', weekAgo),

        // Erreurs images (7j)
        supabase
          .from('image_metrics')
          .select('*', { count: 'exact', head: true })
          .eq('result', 'error')
          .gte('created_at', weekAgo),
      ])

      // Calculer utilisateurs actifs uniques
      const activeUsers = new Set(activeTasks.data?.map(t => t.user_id) || [])
        .size

      // Calculer taux de succès images
      const totalImages = imageStats.data?.total_uploads || 0
      const successImages = imageStats.data?.success_count || 0
      const successRate =
        totalImages > 0 ? (successImages / totalImages) * 100 : 100

      // Score de santé système (basé sur taux d'erreurs)
      const totalOperations = totalImages + (newSubscriptions.count || 0)
      const totalErrors = (webhookErrors.count || 0) + (imageErrors.count || 0)
      const healthScore =
        totalOperations > 0
          ? Math.max(0, 100 - (totalErrors / totalOperations) * 100)
          : 100

      setMetrics({
        users: {
          total: totalUsers.count || 0,
          new_7d: newUsers.count || 0,
          active_7d: activeUsers,
        },
        subscriptions: {
          active: activeSubscriptions.count || 0,
          new_7d: newSubscriptions.count || 0,
          cancelled_7d: cancelledSubscriptions.count || 0,
        },
        images: {
          uploads_7d: totalImages,
          success_rate: Math.round(successRate * 10) / 10,
          storage_saved_mb: imageStats.data?.total_storage_saved_mb || 0,
        },
        errors: {
          webhooks_7d: webhookErrors.count || 0,
          images_7d: imageErrors.count || 0,
        },
        system: {
          health_score: Math.round(healthScore * 10) / 10,
          avg_response_time: imageStats.data?.avg_upload_ms || 0,
        },
      })

      setLastUpdate(new Date())
    } catch (e) {
      console.error('❌ Erreur chargement métriques:', e)
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()

    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

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
          <button onClick={fetchMetrics} className="btn-retry">
            🔄 Réessayer
          </button>
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
          <button
            onClick={fetchMetrics}
            className="btn-refresh"
            title="Rafraîchir"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Santé Système */}
      <section className="metrics-section metrics-section--health">
        <h2>🏥 Santé Système</h2>
        <div className="metrics-grid">
          <div
            className={`metric-card metric-card--${getHealthColor(metrics.system.health_score)}`}
          >
            <div className="metric-card__icon">💚</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Score de santé</div>
              <div className="metric-card__value">
                {metrics.system.health_score}%
              </div>
              <div className="metric-card__subtitle">
                {metrics.system.health_score >= 90
                  ? 'Excellent'
                  : metrics.system.health_score >= 70
                    ? 'Bon'
                    : 'À surveiller'}
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__icon">⚡</div>
            <div className="metric-card__content">
              <div className="metric-card__label">Temps de réponse moyen</div>
              <div className="metric-card__value">
                {Math.round(metrics.system.avg_response_time)} ms
              </div>
              <div className="metric-card__subtitle">Uploads images</div>
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
