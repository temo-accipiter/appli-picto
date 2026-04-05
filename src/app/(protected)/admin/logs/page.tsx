'use client'

import { AdminRoute } from '@/components'
import dynamic from 'next/dynamic'

// Chargement différé : le code admin n'est PAS inclus dans le bundle non-admin
const Logs = dynamic(() => import('@/page-components/admin/logs/Logs'), {
  ssr: false,
})

export default function LogsPage() {
  return (
    <AdminRoute>
      <Logs />
    </AdminRoute>
  )
}
