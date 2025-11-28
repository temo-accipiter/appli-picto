'use client'

import { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'
import './BottomNavItem.scss'

interface BottomNavItemProps {
  /** Icône Lucide à afficher */
  icon: LucideIcon
  /** Label affiché sous l'icône */
  label: string
  /** Route pour lier (optionnel si c'est un bouton d'action) */
  path?: string
  /** Indique si cet item est actif (aria-current="page") */
  isActive?: boolean
  /** Callback au clic (pour dropdowns, etc.) */
  onClick?: () => void
  /** Indique si ce bouton déclenche un dropdown */
  hasDropdown?: boolean
  /** Attributs additionnels */
  className?: string
}

/**
 * BottomNavItem - Item réutilisable pour Bottom Navigation Bar
 *
 * Utilisation:
 * - Avec lien: <BottomNavItem icon={Home} label="Tableau" path="/tableau" isActive={true} />
 * - Avec action: <BottomNavItem icon={Menu} label="Plus" onClick={() => toggle()} hasDropdown />
 *
 * Accessibilité WCAG 2.2 AA:
 * - aria-current="page" sur item actif
 * - aria-label sur icônes
 * - Min-height 44px pour touch target
 * - Focus ring visible
 */
export default function BottomNavItem({
  icon: Icon,
  label,
  path,
  isActive = false,
  onClick,
  hasDropdown = false,
  className = '',
}: BottomNavItemProps) {
  const content: ReactNode = (
    <>
      <Icon
        size={24}
        strokeWidth={2}
        aria-hidden="true"
        className="bottom-nav-item__icon"
      />
      <span className="bottom-nav-item__label">{label}</span>
    </>
  )

  const itemClassName = `bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''} ${className}`

  // Si c'est un lien de navigation
  if (path && !hasDropdown) {
    return (
      <Link
        href={path}
        className={itemClassName}
        aria-current={isActive ? 'page' : undefined}
        aria-label={label}
        onClick={onClick}
      >
        {content}
      </Link>
    )
  }

  // Sinon, c'est un bouton (dropdown, action, etc.)
  return (
    <button
      type="button"
      className={itemClassName}
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive && hasDropdown ? 'true' : undefined}
    >
      {content}
    </button>
  )
}
