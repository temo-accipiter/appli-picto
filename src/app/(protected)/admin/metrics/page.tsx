import Metrics from '@/page-components/admin/metrics/Metrics'

export const metadata = {
  title: 'Métriques - Admin - Appli-Picto',
  description: 'Tableau de bord des métriques système',
}

// Force dynamic rendering (no prerendering) due to client-only dependencies
export const dynamic = 'force-dynamic'

export default function MetricsPage() {
  return <Metrics />
}
