'use client'

import { useAuth } from '@/hooks'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface PrivateRouteProps {
  children: ReactNode
}

/**
 * Guard strict pour routes réservées UNIQUEMENT aux utilisateurs connectés
 *
 * ⚠️ DIFFÉRENCE avec ProtectedRoute :
 * - ProtectedRoute : autorise user OU visitor (pour tester l'app)
 * - PrivateRoute : autorise UNIQUEMENT user connecté (refuse visitor)
 *
 * 📍 UTILISATION :
 * - /profil : données personnelles (email, mot de passe, devices)
 * - /abonnement : gestion abonnement Stripe (subscription_id)
 * - /admin/* : outils administration
 *
 * ⚠️ COMPORTEMENT :
 * - Redirige vers /login si user non connecté (y compris mode Visitor)
 * - Ne s'affiche que si user existe (session active)
 */
export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { user, authReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Attendre que l'auth soit prête
    if (!authReady) return

    // Bloquer si pas d'utilisateur connecté (y compris mode Visitor)
    if (!user) {
      router.replace('/login')
    }
  }, [user, authReady, router])

  // Loading : attendre que authReady soit true
  if (!authReady) {
    return null
  }

  // Bloquer si pas d'utilisateur connecté
  if (!user) {
    return null
  }

  // Autoriser accès UNIQUEMENT si user connecté
  return children
}
