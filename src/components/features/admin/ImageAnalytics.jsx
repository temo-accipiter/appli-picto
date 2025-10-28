// src/components/features/admin/ImageAnalytics.jsx
// Dashboard analytics uploads images (7 derniers jours, admins uniquement)

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { Loader } from '@/components'
import './ImageAnalytics.scss'

export default function ImageAnalytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.rpc(
          'get_image_analytics_summary'
        )

        if (error) {
          throw error
        }

        setStats(data)
      } catch (e) {
        console.error('❌ Erreur stats images:', e)
        setError(e.message)
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
