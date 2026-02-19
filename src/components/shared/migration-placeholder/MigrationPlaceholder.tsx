// src/components/shared/migration-placeholder/MigrationPlaceholder.tsx
// Placeholder neutre affiché pendant la migration des pages legacy vers le nouveau schéma DB.
// Composant purement statique (Server Component) — aucune logique métier.

import Link from 'next/link'
import './MigrationPlaceholder.scss'

interface MigrationPlaceholderProps {
  title?: string
  description?: string
  linkHref?: string
  linkLabel?: string
}

export default function MigrationPlaceholder({
  title = 'En cours de mise à jour',
  description = 'Cette section sera disponible très bientôt.',
  linkHref,
  linkLabel,
}: MigrationPlaceholderProps) {
  return (
    <main className="migration-placeholder" role="main" aria-label={title}>
      <div className="migration-placeholder__content">
        <span
          className="migration-placeholder__icon"
          aria-hidden="true"
          role="img"
        >
          🔧
        </span>

        <h1 className="migration-placeholder__title">{title}</h1>

        <p className="migration-placeholder__description">{description}</p>

        {linkHref && linkLabel && (
          <Link href={linkHref} className="migration-placeholder__link">
            {linkLabel}
          </Link>
        )}
      </div>
    </main>
  )
}
