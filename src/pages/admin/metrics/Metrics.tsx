/**
 * Page Admin : Metrics
 * Dashboard de métriques et monitoring
 */

import MetricsDashboard from '@/components/features/admin/MetricsDashboard'
import { usePermissions } from '@/hooks'
import './Metrics.scss'

export default function Metrics() {
  const { isAdmin } = usePermissions()

  // Vérifier que l'utilisateur est admin
  if (!isAdmin) {
    return (
      <div className="metrics-page">
        <div className="metrics-page__forbidden">
          <h1>🚫 Accès refusé</h1>
          <p>Cette page est réservée aux administrateurs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="metrics-page">
      <MetricsDashboard />
    </div>
  )
}
