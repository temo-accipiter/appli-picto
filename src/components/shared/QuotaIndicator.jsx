// src/components/shared/QuotaIndicator.jsx
import { useRBAC } from '@/hooks'
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
        <span className="quota-text">Chargement...</span>
      </div>
    )
  }

  if (!isFreeAccount) return null

  const info = getQuotaInfo(contentType)
  if (!info) return null

  const monthly = getMonthlyQuotaInfo(contentType)
  const canCreateContent = canCreate(contentType)

  const contentLabel =
    contentType === 'task'
      ? 'tâches'
      : contentType === 'reward'
        ? 'récompenses'
        : 'catégories'

  const monthlyLabel =
    contentType === 'task'
      ? 'tâches ce mois'
      : contentType === 'reward'
        ? 'récompenses ce mois'
        : 'catégories ce mois'

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
          <span className="warning-text">Limite atteinte</span>
        </div>
      )}

      {!canCreateContent && (
        <div className="quota-upgrade">
          <span className="upgrade-text">
            Passez à Premium pour plus de {contentLabel}
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
