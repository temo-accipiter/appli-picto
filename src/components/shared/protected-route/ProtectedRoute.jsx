import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'
import PropTypes from 'prop-types'

export default function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  // Plus besoin de vérifier loading ici car InitializationLoader
  // attend déjà que authReady soit true avant d'afficher quoi que ce soit

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
}
