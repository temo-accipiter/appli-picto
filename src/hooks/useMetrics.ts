'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'

/**
 * Interface pour les métriques du dashboard admin
 */
export interface DashboardMetrics {
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
  health: {
    score: number
  }
}

/**
 * État du hook useMetrics
 */
interface UseMetricsReturn {
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
}

/**
 * Hook pour récupérer les métriques du dashboard admin
 * Centralise toutes les queries Supabase pour les métriques système
 *
 * @returns Métriques, état de chargement et erreur
 */
export function useMetrics(): UseMetricsReturn {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchMetrics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Calculer date il y a 7 jours
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const weekAgoISO = weekAgo.toISOString()

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
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }),

          // Nouveaux utilisateurs (7j)
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgoISO),

          // Utilisateurs actifs (ayant créé une tâche dans les 7j)
          supabase
            .from('taches')
            .select('user_id')
            .gte('created_at', weekAgoISO),

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
            .gte('timestamp', weekAgoISO),

          // Abonnements annulés (7j)
          supabase
            .from('subscription_logs')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'webhook.customer.subscription.deleted')
            .gte('timestamp', weekAgoISO),

          // Stats images (7j)
          supabase.rpc('get_image_analytics_summary'),

          // Erreurs webhooks (7j)
          supabase
            .from('subscription_logs')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'webhook.error')
            .gte('timestamp', weekAgoISO),

          // Erreurs images (7j)
          supabase
            .from('image_metrics')
            .select('*', { count: 'exact', head: true })
            .eq('result', 'error')
            .gte('created_at', weekAgoISO),
        ])

        // Si le composant a été démonté, ne rien faire
        if (cancelled) return

        // Calculer utilisateurs actifs uniques
        const activeUsers = new Set(
          activeTasks.data?.map(t => t.user_id) || []
        ).size

        // Calculer taux de succès images
        const imageData = imageStats.data as Record<string, unknown> | null
        const totalImages = (imageData?.total_uploads as number) || 0
        const successImages = (imageData?.success_count as number) || 0
        const successRate =
          totalImages > 0 ? (successImages / totalImages) * 100 : 100

        // Score de santé système (basé sur taux d'erreurs)
        const totalOperations = totalImages + (newSubscriptions.count || 0)
        const totalErrors =
          (webhookErrors.count || 0) + (imageErrors.count || 0)
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
            storage_saved_mb:
              (imageData?.total_storage_saved_mb as number) || 0,
          },
          errors: {
            webhooks_7d: webhookErrors.count || 0,
            images_7d: imageErrors.count || 0,
          },
          health: {
            score: Math.round(healthScore),
          },
        })
      } catch (err) {
        if (!cancelled) {
          console.error('useMetrics: Erreur fetch métriques:', err)
          setError('Erreur lors du chargement des métriques')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchMetrics()

    // Cleanup: marquer comme annulé si le composant se démonte
    return () => {
      cancelled = true
    }
  }, [])

  return { metrics, loading, error }
}
