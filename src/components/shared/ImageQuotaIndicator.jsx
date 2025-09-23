// src/components/shared/ImageQuotaIndicator.jsx
// Composant pour afficher les quotas d'images
import { useAuth } from '@/hooks'
import { getUserAssetsStats } from '@/services/imageUploadService'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import './ImageQuotaIndicator.scss'

export default function ImageQuotaIndicator({
  assetType = 'task_image', // 'task_image' ou 'reward_image'
  showDetails = true,
  size = 'medium',
  className = '',
}) {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const fetchStats = async () => {
      try {
        const data = await getUserAssetsStats(user.id)
        setStats(data)
      } catch (error) {
        console.error('Erreur récupération stats images:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user?.id])

  if (loading) {
    return (
      <div className={`image-quota-indicator loading ${size} ${className}`}>
        <span>Chargement...</span>
      </div>
    )
  }

  if (!stats) return null

  const getAssetTypeLabel = type => {
    switch (type) {
      case 'task_image':
        return 'images de tâches'
      case 'reward_image':
        return 'images de récompenses'
      default:
        return 'images'
    }
  }

  const getAssetTypeCount = type => {
    switch (type) {
      case 'task_image':
        return stats.task_images || 0
      case 'reward_image':
        return stats.reward_images || 0
      default:
        return stats.total_images || 0
    }
  }

  const getAssetTypeSize = type => {
    switch (type) {
      case 'task_image':
        return stats.task_images_size || 0
      case 'reward_image':
        return stats.reward_images_size || 0
      default:
        return stats.total_size || 0
    }
  }

  const currentCount = getAssetTypeCount(assetType)
  const currentSize = getAssetTypeSize(assetType)

  // Quotas par défaut (à adapter selon les rôles)
  const quotas = {
    free: {
      task_images: 5,
      reward_images: 2,
      total_images: 7,
    },
    abonné: {
      task_images: 40,
      reward_images: 10,
      total_images: 50,
    },
  }

  // Déterminer le quota selon le rôle (simplifié)
  const userQuotas = quotas.free // À améliorer avec le système de rôles

  const getQuotaLimit = type => {
    switch (type) {
      case 'task_image':
        return userQuotas.task_images
      case 'reward_image':
        return userQuotas.reward_images
      default:
        return userQuotas.total_images
    }
  }

  const limit = getQuotaLimit(assetType)
  const percentage = limit > 0 ? Math.round((currentCount / limit) * 100) : 0
  const isNearLimit = percentage >= 80
  const isAtLimit = currentCount >= limit

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div
      className={`image-quota-indicator ${size} ${className} ${
        isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''
      }`}
      title={`${currentCount}/${limit} ${getAssetTypeLabel(assetType)} utilisées (${formatFileSize(currentSize)})`}
    >
      <div className="quota-header">
        <span className="quota-label">{getAssetTypeLabel(assetType)}</span>
        <span className="quota-count">
          {currentCount}/{limit}
        </span>
      </div>

      <div className="quota-bar">
        <div
          className={`quota-fill ${isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        <span className="quota-percentage">{percentage}%</span>
      </div>

      {showDetails && (
        <div className="quota-details">
          <span className="quota-size">{formatFileSize(currentSize)}</span>
          {isAtLimit && (
            <span className="quota-warning">⚠️ Limite atteinte</span>
          )}
        </div>
      )}
    </div>
  )
}

ImageQuotaIndicator.propTypes = {
  assetType: PropTypes.oneOf(['task_image', 'reward_image']),
  showDetails: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
}
