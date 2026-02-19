'use client'

// STABILIZATION PATCH (avant S4) :
// useMetrics utilise des tables legacy non compatibles avec le nouveau schéma DB.
// Le dashboard de métriques sera remis en place en S12 (Admin).
import AdminRoute from '@/components/shared/admin-route/AdminRoute'
import MigrationPlaceholder from '@/components/shared/migration-placeholder/MigrationPlaceholder'

export default function MetricsPage() {
  return (
    <AdminRoute>
      <MigrationPlaceholder
        title="Métriques en cours de migration"
        description="Le dashboard de métriques sera disponible après migration complète."
      />
    </AdminRoute>
  )
}
