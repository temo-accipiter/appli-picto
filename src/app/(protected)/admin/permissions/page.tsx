import AdminPermissions from '@/page-components/admin-permissions/AdminPermissions'

export const metadata = {
  title: 'Gestion des permissions - Admin - Appli-Picto',
  description: 'Gestion des rôles et permissions utilisateurs',
}

// Force dynamic rendering (no prerendering) due to client-only dependencies
export const dynamic = 'force-dynamic'

export default function AdminPermissionsPage() {
  return <AdminPermissions />
}
