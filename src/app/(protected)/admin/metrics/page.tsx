'use client'

import { AdminRoute } from '@/components'
import dynamic from 'next/dynamic'

// Chargement différé : le code admin n'est PAS inclus dans le bundle non-admin
const Metrics = dynamic(
  () => import('@/page-components/admin/metrics/Metrics'),
  { ssr: false }
)

export default function MetricsPage() {
  return (
    <AdminRoute>
      <Metrics />
    </AdminRoute>
  )
}
