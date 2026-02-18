'use client'

import AdminRoute from '@/components/shared/admin-route/AdminRoute'
import dynamic from 'next/dynamic'

// Chargement différé : le code admin n'est PAS inclus dans le bundle non-admin
const AdminPermissions = dynamic(
  () => import('@/page-components/admin-permissions/AdminPermissions'),
  { ssr: false }
)

export default function AdminPermissionsPage() {
  return (
    <AdminRoute>
      <AdminPermissions />
    </AdminRoute>
  )
}
