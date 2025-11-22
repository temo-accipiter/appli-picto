'use client'

import { useAuth } from '@/hooks'
import { useRouter } from 'next/navigation'
import useSimpleRole from '@/hooks/useSimpleRole'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, authReady } = useAuth()
  const { isVisitor, ready: roleReady } = useSimpleRole()
  const router = useRouter()

  useEffect(() => {
    // Attendre que l'auth et les rôles soient prêts
    if (!authReady || !roleReady) return

    // Si pas d'utilisateur OU visiteur → rediriger vers login
    if (!user || isVisitor) {
      router.replace('/login')
    }
  }, [user, isVisitor, authReady, roleReady, router])

  // Ne rien afficher pendant le chargement ou la redirection
  if (!authReady || !roleReady || !user || isVisitor) {
    return null
  }

  return children
}
