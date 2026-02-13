'use client'

import { useAuth } from '@/hooks'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Composant pour protéger les routes nécessitant une authentification
 *
 * Redirige vers /login si l'utilisateur n'est pas connecté
 * (mode Visitor = !user)
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, authReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Attendre que l'auth soit prête
    if (!authReady) return

    // Si pas d'utilisateur (Visitor) → rediriger vers login
    if (!user) {
      router.replace('/login')
    }
  }, [user, authReady, router])

  // Ne rien afficher pendant le chargement ou la redirection
  if (!authReady || !user) {
    return null
  }

  return children
}
