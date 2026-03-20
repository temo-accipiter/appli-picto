'use client'

import AdminRoute from '@/components/shared/admin-route/AdminRoute'
import dynamic from 'next/dynamic'

// Chargement différé : le code admin n'est PAS inclus dans le bundle non-admin
const BankCardsManagement = dynamic(
  () => import('@/page-components/admin/bank-cards/BankCardsManagement'),
  {
    ssr: false,
  }
)

export default function BankCardsPage() {
  return (
    <AdminRoute>
      <BankCardsManagement />
    </AdminRoute>
  )
}
