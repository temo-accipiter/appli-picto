// src/components/shared/image-quota-indicator/ImageQuotaIndicator.tsx
// Composant pour afficher les quotas d'images (tâches/récompenses)
import { useRBAC, useI18n } from '@/hooks'
import './ImageQuotaIndicator.scss'

type AssetType = 'task_image' | 'reward_image'
type QuotaSize = 'small' | 'medium' | 'large'

interface ImageQuotaIndicatorProps {
  assetType?: AssetType
  showDetails?: boolean
  size?: QuotaSize
  className?: string
}

export default function ImageQuotaIndicator({
  assetType = 'task_image',
  showDetails = true,
  size = 'medium',
  className = '',
}: ImageQuotaIndicatorProps) {
  const { t } = useI18n()
  const { loading, isFree, getQuotaInfo } = useRBAC()

  if (loading) {
    return (
      <div className={`image-quota-indicator loading ${size} ${className}`}>
        <span>{t('quota.loading')}</span>
      </div>
    )
  }

  if (!isFree) return null

  // Mapper asset_type vers contentType pour useRBAC
  const contentType =
    assetType === 'task_image'
      ? 'task'
      : assetType === 'reward_image'
        ? 'reward'
        : null

  if (!contentType) return null

  const info = getQuotaInfo(contentType)
  if (!info) return null

  const { current, limit, percentage, isNearLimit, isAtLimit } = info

  const getAssetTypeLabel = (type: AssetType): string => {
    switch (type) {
      case 'task_image':
        return t('quota.taskImages') || 'Tâches'
      case 'reward_image':
        return t('quota.rewardImages') || 'Récompenses'
      default:
        return t('quota.images') || 'Images'
    }
  }

  return (
    <div
      className={`image-quota-indicator ${size} ${className} ${
        isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''
      }`}
      title={`${current}/${limit} ${getAssetTypeLabel(assetType)} utilisées`}
    >
      <div className="quota-header">
        <span className="quota-label">{getAssetTypeLabel(assetType)}</span>
        <span className="quota-count">
          {current}/{limit}
        </span>
      </div>

      <div className="quota-bar">
        <div
          className={`quota-fill ${isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        <span className="quota-percentage">{percentage}%</span>
      </div>

      {showDetails && isAtLimit && (
        <div className="quota-details">
          <span className="quota-warning">⚠️ {t('quota.limitReached')}</span>
        </div>
      )}
    </div>
  )
}

