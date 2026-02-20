'use client'

// src/components/shared/QuotaIndicator.tsx
import { useRBAC, useI18n } from '@/hooks'
import './QuotaIndicator.scss'

type ContentType = 'task' | 'reward' | 'category'
type QuotaSize = 'small' | 'medium' | 'large'

interface QuotaIndicatorProps {
  contentType?: ContentType
  showLabel?: boolean
  showPercentage?: boolean
  showRemaining?: boolean
  size?: QuotaSize
  className?: string
  onClick?: (() => void) | null
}

export default function QuotaIndicator({
  contentType = 'task',
  showLabel = true,
  showPercentage = true,
  showRemaining = true,
  size = 'medium',
  className = '',
  onClick = null,
}: QuotaIndicatorProps) {
  const { t } = useI18n()
  const {
    loading,
    isFree: isFreeAccount,
    getQuotaInfo,
    getMonthlyQuotaInfo,
    // canCreate SUPPRIMÉ : validation métier en DB uniquement (§1.1 FRONTEND_CONTRACT)
  } = useRBAC()

  if (loading) {
    return (
      <div className={`quota-indicator loading ${size} ${className}`}>
        <div className="quota-bar">
          <div className="quota-fill" style={{ width: '0%' }} />
        </div>
        <span className="quota-text">{t('quota.loading')}</span>
      </div>
    )
  }

  if (!isFreeAccount) return null

  const info = getQuotaInfo(contentType)
  console.log('🔍 [QuotaIndicator] Debug:', {
    contentType,
    isFreeAccount,
    info,
    loading,
  })
  if (!info) return null

  const monthly = getMonthlyQuotaInfo(contentType)
  // canCreateContent SUPPRIMÉ : affichage basé sur isAtLimit uniquement (lecture passive)

  const contentLabel =
    contentType === 'task'
      ? t('quota.tasksLabel')
      : contentType === 'reward'
        ? t('quota.rewardsLabel')
        : t('quota.categoriesLabel')

  const monthlyLabel =
    contentType === 'task'
      ? t('quota.tasksThisMonth')
      : contentType === 'reward'
        ? t('quota.rewardsThisMonth')
        : t('quota.categoriesThisMonth')

  const {
    current,
    limit,
    remaining,
    percentage,
    isNearLimit,
    isAtLimit,
    period,
  } = info

  // ✅ PHASE 5: Calculer niveau de warning (80-89% = warning, 90-99% = critical)
  const isLimitWarning = percentage >= 90 && percentage < 100
  const warningLevel = isAtLimit
    ? 'at-limit'
    : isLimitWarning
      ? 'limit-warning'
      : isNearLimit
        ? 'near-limit'
        : 'normal'

  // ✅ PHASE 5: Message selon période (mensuel ou total)
  const periodLabel = period === 'monthly' ? 'ce mois-ci' : 'au total'

  return (
    <div
      className={`quota-indicator ${size} ${className} ${onClick ? 'clickable' : ''} ${warningLevel}`}
      onClick={onClick || undefined}
      title={`${current}/${limit} ${contentLabel} utilisées ${periodLabel}`}
    >
      {showLabel && (
        <div className="quota-label">
          <span className="content-type">{contentLabel}</span>
          {monthly && (
            <span className="monthly-info">
              ({monthly.current}/{monthly.limit} {monthlyLabel})
            </span>
          )}
        </div>
      )}

      <div className="quota-bar">
        <div
          className={`quota-fill ${warningLevel}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        {showPercentage && (
          <span className="quota-percentage">{percentage}%</span>
        )}
      </div>

      <div className="quota-details">
        <span className="quota-current">{current}</span>
        <span className="quota-separator">/</span>
        <span className="quota-limit">{limit}</span>
        {showRemaining && remaining > 0 && (
          <span className="quota-remaining">
            ({remaining} restante{remaining > 1 ? 's' : ''}) {periodLabel}
          </span>
        )}
      </div>

      {/* ✅ PHASE 5: Warning à 90% */}
      {isLimitWarning && !isAtLimit && (
        <div className="quota-warning limit-warning">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            Attention : proche de la limite ({percentage}%)
          </span>
        </div>
      )}

      {/* ✅ PHASE 5: Info à 80% */}
      {isNearLimit && !isLimitWarning && !isAtLimit && (
        <div className="quota-info near-limit">
          <span className="info-icon">ℹ️</span>
          <span className="info-text">
            Quota en cours d&apos;utilisation ({percentage}%)
          </span>
        </div>
      )}

      {isAtLimit && (
        <div className="quota-warning at-limit">
          <span className="warning-icon">🚫</span>
          <span className="warning-text">{t('quota.limitReached')}</span>
          {/* Message upgrade affiché uniquement si limite atteinte (lecture passive) */}
          <div className="quota-upgrade">
            <span className="upgrade-text">
              {t('quota.upgradeToPremium', { contentType: contentLabel })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
