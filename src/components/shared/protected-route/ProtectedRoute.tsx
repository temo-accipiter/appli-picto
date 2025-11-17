'use client'

import { useAuth } from '@/hooks'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useAuth()
  const router = useRouter()

  // Plus besoin de vérifier loading ici car InitializationLoader
  // attend déjà que authReady soit true avant d'afficher quoi que ce soit

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  if (!user) {
    return null // Afficher rien pendant la redirection
  }

  return children
}
