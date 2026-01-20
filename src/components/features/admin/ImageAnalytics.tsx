'use client'

// src/components/features/admin/ImageAnalytics.tsx
// Dashboard analytics uploads images (7 derniers jours, admins uniquement)

import { useEffect, useState } from 'react'
import { Loader } from '@/components'
import './ImageAnalytics.scss'

interface ImageStats {
  total_uploads: number
  success_count: number
  failed_count: number
  avg_compression_ratio: number
  avg_conversion_ms: number
  avg_upload_ms: number
  total_storage_saved_mb: number
}

export default function ImageAnalytics() {
  const [stats, setStats] = useState<ImageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        // TODO: Réactiver quand fonction RPC get_image_analytics_summary sera créée
        // Temporairement désactivé - retourne des stats vides
        console.warn(
          '⚠️ ImageAnalytics: fonction RPC get_image_analytics_summary non implémentée'
        )
        setStats({
          total_uploads: 0,
          success_count: 0,
          failed_count: 0,
          avg_compression_ratio: 0,
          avg_conversion_ms: 0,
          avg_upload_ms: 0,
          total_storage_saved_mb: 0,
        })

        /* Code original à réactiver :
        const { data, error } = await supabase.rpc(
          'get_image_analytics_summary'
        )

        if (error) {
          throw error
        }

        setStats(data as ImageStats | null)
        */
      } catch (e) {
        console.error('❌ Erreur stats images:', e)
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="image-analytics">
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="image-analytics">
        <p className="image-analytics__error">
          ❌ Erreur chargement statistiques : {error}
        </p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="image-analytics">
        <p className="image-analytics__empty">Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <div className="image-analytics">
      <h2 className="image-analytics__title">
        📊 Statistiques images (7 derniers jours)
      </h2>

      <div className="image-analytics__grid">
        <div className="stat-card">
          <h3>Uploads totaux</h3>
          <p className="stat-card__value">{stats.total_uploads || 0}</p>
        </div>

        <div className="stat-card stat-card--success">
          <h3>✅ Succès</h3>
          <p className="stat-card__value">{stats.success_count || 0}</p>
        </div>

        <div className="stat-card stat-card--error">
          <h3>❌ Échecs</h3>
          <p className="stat-card__value">{stats.failed_count || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Compression moyenne</h3>
          <p className="stat-card__value">
            {stats.avg_compression_ratio || 0}%
          </p>
        </div>

        <div className="stat-card">
          <h3>Temps conversion</h3>
          <p className="stat-card__value">
            {Math.round(stats.avg_conversion_ms || 0)} ms
          </p>
        </div>

        <div className="stat-card">
          <h3>Temps upload</h3>
          <p className="stat-card__value">
            {Math.round(stats.avg_upload_ms || 0)} ms
          </p>
        </div>

        <div className="stat-card stat-card--highlight">
          <h3>💾 Stockage économisé</h3>
          <p className="stat-card__value">
            {stats.total_storage_saved_mb || 0} MB
          </p>
        </div>
      </div>
    </div>
  )
}
