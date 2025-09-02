import { Loader } from '@/components'
import { usePermissions } from '@/contexts'
import { Navigate } from 'react-router-dom'

/**
 * Page de redirection intelligente qui décide automatiquement où envoyer l'utilisateur
 * - Visiteurs → /tableau-demo
 * - Utilisateurs connectés → /tableau
 */
export default function HomeRedirect() {
  const { role, loading } = usePermissions()

  // Afficher un loader pendant la détermination du rôle
  if (loading) {
    return (
      <div className="home-redirect-loading">
        <Loader />
        <p>Chargement...</p>
      </div>
    )
  }

  // Redirection selon le rôle
  if (role === 'visitor') {
    return <Navigate to="/tableau-demo" replace />
  } else {
    return <Navigate to="/tableau" replace />
  }
}
