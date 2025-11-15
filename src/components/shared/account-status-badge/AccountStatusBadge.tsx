'use client'

// src/components/shared/AccountStatusBadge.tsx
import { useAccountStatus } from '@/hooks'
import './AccountStatusBadge.scss'

type BadgeSize = 'small' | 'medium' | 'large'

interface AccountStatusBadgeProps {
  showDescription?: boolean
  size?: BadgeSize
  className?: string
  onClick?: (() => void) | null
}

/**
 * Composant pour afficher l'état du compte utilisateur
 * Affiche un badge avec l'état, l'icône et la description
 */
export default function AccountStatusBadge({
  showDescription = false,
  size = 'medium',
  className = '',
  onClick = null,
}: AccountStatusBadgeProps) {
  const { accountStatus, loading, statusDisplay, canUseApp } =
    useAccountStatus()

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
      onClick={onClick || undefined}
      title={showDescription ? undefined : description}
    >
      <div className="status-icon">{icon}</div>
      <span className="status-label">{label}</span>
      {showDescription && (
        <span className="status-description">{description}</span>
      )}
      {!canUseApp && (
        <div className="status-warning">⚠️ Compte non fonctionnel</div>
      )}
    </div>
  )
}
