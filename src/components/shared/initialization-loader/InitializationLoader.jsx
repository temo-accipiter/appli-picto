import { Loader } from '@/components'
import { useAuth } from '@/hooks'
import { usePermissions } from '@/contexts'
import PropTypes from 'prop-types'
import './InitializationLoader.scss'

/**
 * Loader global qui attend que AuthContext ET PermissionsContext soient prêts
 * avant d'afficher l'application. Cela évite les "sursauts" pendant le chargement initial.
 */
export default function InitializationLoader({ children }) {
  const { authReady } = useAuth()
  const { ready: permissionsReady } = usePermissions()

  // Attendre que TOUT soit initialisé
  const isReady = authReady && permissionsReady

  if (!isReady) {
    return (
      <div className="initialization-loader">
        <div className="initialization-loader__content">
          <Loader />
          <p className="initialization-loader__text">Chargement...</p>
        </div>
      </div>
    )
  }

  return children
}

InitializationLoader.propTypes = {
  children: PropTypes.node.isRequired,
}
