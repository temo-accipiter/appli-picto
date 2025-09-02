import { usePermissions } from '@/contexts/PermissionsContext'
import PropTypes from 'prop-types'

/**
 * Composant FeatureGate pour contrôler l'affichage des fonctionnalités
 * Enveloppez n'importe quel élément UI avec <FeatureGate feature="CONFETTI">...</FeatureGate>
 */
export const FeatureGate = ({
  feature,
  children,
  fallback = null,
  requireAll = false,
  features = [],
}) => {
  const { can, canAll, canAny, loading } = usePermissions()

  // ⚠️ Éviter les vérifications de permissions pendant le chargement
  // pour éviter les warnings dans la console
  if (loading) {
    // Pendant le chargement, afficher le contenu par défaut
    // Cela évite les warnings "Fonctionnalité non trouvée" 
    // qui apparaissent avant que les permissions soient chargées
    return children
  }

  // Si on a une liste de features
  if (features.length > 0) {
    const hasAccess = requireAll ? canAll(features) : canAny(features)
    return hasAccess ? children : fallback
  }

  // Si on a une seule feature
  if (feature) {
    return can(feature) ? children : fallback
  }

  // Par défaut, afficher le contenu
  return children
}

FeatureGate.propTypes = {
  /** Nom de la fonctionnalité à vérifier */
  feature: PropTypes.string,
  /** Contenu à afficher si la fonctionnalité est accessible */
  children: PropTypes.node.isRequired,
  /** Contenu alternatif si la fonctionnalité n'est pas accessible */
  fallback: PropTypes.node,
  /** Liste de fonctionnalités à vérifier (alternative à feature) */
  features: PropTypes.arrayOf(PropTypes.string),
  /** Si true, toutes les fonctionnalités doivent être accessibles (AND), sinon au moins une (OR) */
  requireAll: PropTypes.bool,
}

/**
 * Composant FeatureGate pour les fonctionnalités premium
 * Affiche automatiquement un fallback avec un message d'upgrade
 */
export const PremiumFeatureGate = ({
  feature,
  children,
  upgradeMessage = 'Cette fonctionnalité nécessite un abonnement premium',
  showUpgradeButton = true,
}) => {
  const { can, isVisitor, loading } = usePermissions()

  // ⚠️ Éviter les vérifications de permissions pendant le chargement
  if (loading) {
    // Pendant le chargement, afficher le contenu par défaut
    // pour éviter les warnings dans la console
    return children
  }

  if (can(feature)) {
    return children
  }

  const fallback = (
    <div className="premium-feature-fallback">
      <p className="premium-message">{upgradeMessage}</p>
      {showUpgradeButton && isVisitor && (
        <button
          className="upgrade-button"
          onClick={() => (window.location.href = '/signup')}
        >
          S'abonner
        </button>
      )}
    </div>
  )

  return fallback
}

PremiumFeatureGate.propTypes = {
  /** Nom de la fonctionnalité à vérifier */
  feature: PropTypes.string.isRequired,
  /** Contenu à afficher si la fonctionnalité est accessible */
  children: PropTypes.node.isRequired,
  /** Message personnalisé pour l'upgrade */
  upgradeMessage: PropTypes.string,
  /** Afficher le bouton d'upgrade */
  showUpgradeButton: PropTypes.bool,
}
