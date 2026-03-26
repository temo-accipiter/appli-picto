import { PrivateRoute } from '@/components'
import type { ReactNode } from 'react'

/**
 * Layout strict pour /profil
 *
 * ⚠️ RÈGLE : /profil est réservé UNIQUEMENT aux utilisateurs connectés
 * - Le mode Visitor ne peut PAS accéder à /profil (données personnelles)
 * - Utilise PrivateRoute (strict auth) au lieu de ProtectedRoute (autorise visitor)
 *
 * 📍 DONNÉES SENSIBLES :
 * - Email, mot de passe, devices
 * - Informations personnelles utilisateur
 * - Gestion compte
 */
export default function ProfilLayout({ children }: { children: ReactNode }) {
  return <PrivateRoute>{children}</PrivateRoute>
}
