import TimeTimerPage from '@/page-components/time-timer/TimeTimerPage'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Time Timer - Appli-Picto',
  description: 'Time Timer visuel pour enfants TSA',
}

export default function TimeTimer() {
  return <TimeTimerPage />
}
