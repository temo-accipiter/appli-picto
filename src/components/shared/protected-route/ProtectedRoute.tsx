'use client'

import { useAuth, useIsVisitor } from '@/hooks'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Composant pour protéger les routes nécessitant une authentification OU mode Visitor
 *
 * ✅ CONTRAT PRODUIT (ux.md / PRODUCT_MODEL.md) :
 * - Le Visiteur DOIT pouvoir accéder à /edition et /tableau pour tester l'app
 * - Avec cartes de banque uniquement (pas de cartes personnelles)
 * - Les hooks Adapter (useSequencesWithVisitor) gèrent automatiquement le basculement IndexedDB ↔ Supabase
 *
 * ⚠️ COMPORTEMENT :
 * - Autorise accès si `user` (connecté) OU `isVisitor` (mode Visitor)
 * - Redirige vers /login SEULEMENT si ni connecté, ni visiteur
 * - Pour routes strictement réservées aux utilisateurs connectés (/profil, /abonnement), utiliser PrivateRoute
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, authReady } = useAuth()
  const { isVisitor } = useIsVisitor()
  const router = useRouter()

  useEffect(() => {
    // Attendre que l'auth soit prête
    if (!authReady) return

    // Bloquer SEULEMENT si ni connecté, ni visiteur
    // Visitor = utilisateur non connecté qui peut tester l'app avec cartes banque
    if (!user && !isVisitor) {
      router.replace('/login')
    }
  }, [user, isVisitor, authReady, router])

  // Loading : attendre que authReady soit true
  if (!authReady) {
    return null
  }

  // Bloquer SEULEMENT si ni connecté, ni visiteur
  if (!user && !isVisitor) {
    return null
  }

  // Autoriser accès : user connecté OU mode Visitor
  return children
}
