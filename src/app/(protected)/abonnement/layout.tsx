import { PrivateRoute } from '@/components'
import type { ReactNode } from 'react'

/**
 * Layout strict pour /abonnement
 *
 * ⚠️ RÈGLE : /abonnement est réservé UNIQUEMENT aux utilisateurs connectés
 * - Le mode Visitor ne peut PAS accéder à /abonnement (gestion Stripe)
 * - Utilise PrivateRoute (strict auth) au lieu de ProtectedRoute (autorise visitor)
 *
 * 📍 DONNÉES SENSIBLES :
 * - Subscription Stripe (subscription_id)
 * - Informations paiement
 * - Gestion abonnement
 */
export default function AbonnementLayout({ children }: { children: ReactNode }) {
  return <PrivateRoute>{children}</PrivateRoute>
}
