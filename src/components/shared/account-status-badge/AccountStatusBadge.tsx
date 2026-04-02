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
const STATUS_DISPLAY = {
  free: {
    label: 'Gratuit',
    color: 'status-free',
    icon: '🆓',
    description: 'Compte gratuit',
  },
  subscriber: {
    label: 'Abonné',
    color: 'status-subscriber',
    icon: '⭐',
    description: 'Compte abonné',
  },
  admin: {
    label: 'Admin',
    color: 'status-admin',
    icon: '🔧',
    description: 'Compte administrateur',
  },
} as const

export default function AccountStatusBadge({
  showDescription = false,
  size = 'medium',
  className = '',
  onClick = null,
}: AccountStatusBadgeProps) {
  const { status, loading } = useAccountStatus()

  if (loading) {
    return (
      <div className={`account-status-badge loading ${size} ${className}`}>
        <div className="status-icon">⏳</div>
        <span className="status-label">Chargement...</span>
      </div>
    )
  }

  if (!status) {
    return null
  }

  const { label, color, icon, description } = STATUS_DISPLAY[status]

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
    </div>
  )
}
