'use client'

import AdminRoute from '@/components/shared/admin-route/AdminRoute'
import MigrationPlaceholder from '@/components/shared/migration-placeholder/MigrationPlaceholder'

export default function AdminPermissionsPage() {
  return (
    <AdminRoute>
      <MigrationPlaceholder
        title="Administration"
        description="Cette section est en cours de migration."
        linkHref="/admin/logs"
        linkLabel="Voir les journaux"
      />
    </AdminRoute>
  )
}
