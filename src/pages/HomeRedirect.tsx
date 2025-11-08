import { Loader } from '@/components'
import { usePermissions } from '@/contexts'
import { Navigate } from 'react-router-dom'

/**
 * Page de redirection intelligente qui décide automatiquement où envoyer l'utilisateur
 * - Visiteurs → /tableau (avec cartes prédéfinies)
 * - Utilisateurs connectés → /tableau (avec cartes personnelles)
 */
export default function HomeRedirect() {
  const { role: _role, loading } = usePermissions()

  // Afficher un loader pendant la détermination du rôle
  if (loading) {
    return (
      <div className="home-redirect-loading">
        <Loader />
        <p>Chargement...</p>
      </div>
    )
  }

  // Redirection selon le rôle - tous vers /tableau
  return <Navigate to="/tableau" replace />
}
