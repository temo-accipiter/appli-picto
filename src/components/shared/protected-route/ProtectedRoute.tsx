import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useAuth()
  const location = useLocation()

  // Plus besoin de vérifier loading ici car InitializationLoader
  // attend déjà que authReady soit true avant d'afficher quoi que ce soit

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
