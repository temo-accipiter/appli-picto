'use client'

import { AdminRoute } from '@/components'
import dynamic from 'next/dynamic'

// Chargement différé : le code admin n'est PAS inclus dans le bundle non-admin
const Permissions = dynamic(
  () => import('@/page-components/admin/permissions/Permissions'),
  { ssr: false }
)

export default function AdminPermissionsPage() {
  return (
    <AdminRoute>
      <Permissions />
    </AdminRoute>
  )
}
