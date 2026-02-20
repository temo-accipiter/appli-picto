'use client'

/**
 * Page Admin : Metrics
 * Dashboard de métriques et monitoring.
 *
 * Règles S12 §8.10 :
 * - Guard déjà appliqué par AdminRoute (404 neutre, sans hint)
 * - Pas de garde locale qui révèlerait l'existence de la page
 */

import MetricsDashboard from '@/components/features/admin/MetricsDashboard'
import './Metrics.scss'

export default function Metrics() {
  // AdminRoute garantit que seul un admin atteint ce composant
  return (
    <div className="metrics-page">
      <MetricsDashboard />
    </div>
  )
}
