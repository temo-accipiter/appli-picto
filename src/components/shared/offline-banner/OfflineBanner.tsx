'use client'

// src/components/shared/offline-banner/OfflineBanner.tsx — S8 Offline
//
// Bandeau discret et persistant indiquant l'état offline en Contexte Édition.
//
// ⚠️ RÈGLES CONTRAT §4.4.1 + §6.1 catégorie #4
// - NON modal, NON bloquant
// - Disparaît automatiquement au retour réseau
// - EXCLUSIVEMENT en Contexte Édition (jamais en Tableau — §6.2)
// - Accessible (role="status", live region)
//
// ⚠️ RÈGLES TSA / WCAG 2.2 AA
// - Discret visuellement (ne surcharge pas l'interface)
// - Non agressif : pas de clignotement, animation douce (≤ 0.3s)
// - Message court, non technique, compréhensible pour adulte
// - Cible tactile ≥ 44px pour le bouton de fermeture si présent

import './OfflineBanner.scss'

interface OfflineBannerProps {
  /** Nombre de validations en attente de synchronisation */
  pendingCount?: number
}

/**
 * Bandeau persistant signalant l'état offline en Contexte Édition.
 *
 * S'affiche uniquement quand le composant parent décide de le rendre
 * (quand `isOnline === false`). Se retire automatiquement quand le
 * parent cesse de le rendre (quand `isOnline === true`).
 *
 * @example
 * ```tsx
 * // Dans EditionTimeline ou page Édition uniquement
 * const { isOnline, pendingCount } = useOffline()
 * {!isOnline && <OfflineBanner pendingCount={pendingCount} />}
 * ```
 */
export default function OfflineBanner({
  pendingCount = 0,
}: OfflineBannerProps) {
  return (
    <div
      className="offline-banner"
      role="status"
      aria-live="polite"
      aria-label="Mode hors connexion"
    >
      <span className="offline-banner__icon" aria-hidden="true">
        ⚡
      </span>
      <span className="offline-banner__message">
        Hors connexion — les modifications de structure sont indisponibles
        {pendingCount > 0 && (
          <span
            className="offline-banner__pending"
            aria-label={`${pendingCount} validation${pendingCount > 1 ? 's' : ''} en attente`}
          >
            {' '}
            · {pendingCount} en attente de sync
          </span>
        )}
      </span>
    </div>
  )
}
