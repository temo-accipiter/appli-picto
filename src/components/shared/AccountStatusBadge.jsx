// src/components/shared/AccountStatusBadge.jsx
import { useAccountStatus } from '@/hooks'
import PropTypes from 'prop-types'
import './AccountStatusBadge.scss'

/**
 * Composant pour afficher l'état du compte utilisateur
 * Affiche un badge avec l'état, l'icône et la description
 */
export default function AccountStatusBadge({ 
  showDescription = false, 
  size = 'medium',
  className = '',
  onClick = null 
}) {
  const { accountStatus, loading, statusDisplay, canUseApp } = useAccountStatus()

  if (loading) {
    return (
      <div className={`account-status-badge loading ${size} ${className}`}>
        <div className="status-icon">⏳</div>
        <span className="status-label">Chargement...</span>
      </div>
    )
  }

  if (!accountStatus) {
    return null
  }

  const { label, color, icon, description } = statusDisplay

  return (
    <div 
      className={`account-status-badge ${color} ${size} ${className} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      title={showDescription ? undefined : description}
    >
      <div className="status-icon">{icon}</div>
      <span className="status-label">{label}</span>
      {showDescription && (
        <span className="status-description">{description}</span>
      )}
      {!canUseApp && (
        <div className="status-warning">
          ⚠️ Compte non fonctionnel
        </div>
      )}
    </div>
  )
}

AccountStatusBadge.propTypes = {
  showDescription: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
  onClick: PropTypes.func,
}
