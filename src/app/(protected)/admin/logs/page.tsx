import Logs from '@/page-components/admin/logs/Logs'

export const metadata = {
  title: 'Logs - Admin - Appli-Picto',
  description: "Journal des événements et logs d'audit",
}

// Force dynamic rendering (no prerendering) due to client-only dependencies
export const dynamic = 'force-dynamic'

export default function LogsPage() {
  return <Logs />
}
