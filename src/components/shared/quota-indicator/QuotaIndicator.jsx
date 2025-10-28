// src/components/shared/QuotaIndicator.jsx
import { useRBAC, useI18n } from '@/hooks'
import PropTypes from 'prop-types'
import './QuotaIndicator.scss'

export default function QuotaIndicator({
  contentType = 'task',
  showLabel = true,
  showPercentage = true,
  showRemaining = true,
  size = 'medium',
  className = '',
  onClick = null,
}) {
  const { t } = useI18n()
  const {
    loading,
    isFree: isFreeAccount,
    getQuotaInfo,
    getMonthlyQuotaInfo,
    canCreate,
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
  const canCreateContent = canCreate(contentType)

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

  const { current, limit, remaining, percentage, isNearLimit, isAtLimit } = info

  return (
    <div
      className={`quota-indicator ${size} ${className} ${onClick ? 'clickable' : ''} ${
        isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''
      }`}
      onClick={onClick}
      title={`${current}/${limit} ${contentLabel} utilisées`}
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
          className={`quota-fill ${isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}`}
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
            ({remaining} restante{remaining > 1 ? 's' : ''})
          </span>
        )}
      </div>

      {isAtLimit && (
        <div className="quota-warning">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">{t('quota.limitReached')}</span>
        </div>
      )}

      {!canCreateContent && (
        <div className="quota-upgrade">
          <span className="upgrade-text">
            {t('quota.upgradeToPremium', { contentType: contentLabel })}
          </span>
        </div>
      )}
    </div>
  )
}

QuotaIndicator.propTypes = {
  contentType: PropTypes.oneOf(['task', 'reward', 'category']),
  showLabel: PropTypes.bool,
  showPercentage: PropTypes.bool,
  showRemaining: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
  onClick: PropTypes.func,
}
