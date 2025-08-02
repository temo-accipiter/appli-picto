import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'
import PropTypes from 'prop-types'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
}
