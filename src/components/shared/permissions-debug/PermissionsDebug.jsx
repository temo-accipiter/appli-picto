import { usePermissions } from '@/contexts'
import { Crown, Eye, EyeOff, Settings, Shield, User } from 'lucide-react'
import { useState } from 'react'
import './PermissionsDebug.scss'

export const PermissionsDebug = () => {
  const {
    role,
    can,
    loading,
    subscription,
    isVisitor,
    isSubscriber,
    isAdmin,
    permissions,
    features,
  } = usePermissions()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // N'afficher que pour les administrateurs en développement
  if (import.meta.env.PROD || !isAdmin) {
    return null
  }

  if (loading) {
    return (
      <div className="permissions-debug">
        <div className="debug-header">
          <h3>🔧 Permissions Debug</h3>
          <div className="loading">Chargement...</div>
        </div>
      </div>
    )
  }

  // Créer une structure de données pour l'affichage
  const getFeaturePermissions = () => {
    if (!features || !permissions) return []

    return features.map(feature => {
      const featurePermissions = {}

      // Trouver les permissions pour cette fonctionnalité
      const featurePerms = permissions.filter(p => p.feature_id === feature.id)

      // Organiser par rôle
      featurePerms.forEach(perm => {
        const roleName = perm.role_name || 'unknown'
        featurePermissions[roleName] = perm.can_access
      })

      return {
        name: feature.name,
        display_name: feature.display_name,
        description: feature.description,
        permissions: featurePermissions,
      }
    })
  }

  const featurePermissions = getFeaturePermissions()

  // Filtrer les features par recherche
  const filteredFeatures = featurePermissions.filter(feature => {
    if (!searchTerm) return true
    return (
      feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.keys(feature.permissions).some(role =>
        role.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  })

  // Obtenir l'icône pour chaque rôle
  const getRoleIcon = role => {
    switch (role) {
      case 'visitor':
        return <User size={16} />
      case 'abonne':
        return <Crown size={16} />
      case 'admin':
        return <Shield size={16} />
      default:
        return <User size={16} />
    }
  }

  // Obtenir la couleur pour chaque rôle
  const getRoleColor = role => {
    switch (role) {
      case 'visitor':
        return '#6b7280'
      case 'abonne':
        return '#f59e0b'
      case 'admin':
        return '#dc2626'
      default:
        return '#6b7280'
    }
  }

  return (
    <div className="permissions-debug">
      <div className="debug-header">
        <div className="header-left">
          <h3>🔧 Panneau d'Administration des Permissions</h3>
          <div className="current-role">
            Rôle actuel: <span className={`role-badge ${role}`}>{role}</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="debug-button toggle-advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Options avancées"
          >
            <Settings size={16} />
            {showAdvanced ? 'Masquer' : 'Avancé'}
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="advanced-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Rechercher une fonctionnalité..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      )}

      <div className="features-list">
        <div className="features-header">
          <div className="feature-name">Fonctionnalité</div>
          <div className="permissions-grid">
            <div className="role-header visitor">
              <User size={16} />
              <span>Visiteur</span>
            </div>
            <div className="role-header abonne">
              <Crown size={16} />
              <span>Abonné</span>
            </div>
            <div className="role-header admin">
              <Shield size={16} />
              <span>Admin</span>
            </div>
          </div>
        </div>

        {filteredFeatures.map(feature => {
          return (
            <div key={feature.name} className="feature-row">
              <div className="feature-name">
                <span className="feature-title">
                  {feature.display_name || feature.name}
                </span>
                {feature.description && (
                  <span className="feature-description">
                    {feature.description}
                  </span>
                )}
              </div>

              <div className="permissions-grid">
                {['visitor', 'abonne', 'admin'].map(roleName => {
                  const isEnabled =
                    feature.permissions[roleName] || roleName === 'admin'

                  return (
                    <div
                      key={roleName}
                      className={`permission-cell ${roleName}`}
                    >
                      <div
                        className={`permission-status ${isEnabled ? 'enabled' : 'disabled'}`}
                      >
                        {isEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="status-text">
                          {isEnabled ? 'Oui' : 'Non'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="debug-footer">
        <div className="info-text">
          💡 <strong>Mode Debug Activé</strong> - Affichage des permissions
          depuis la base de données.
        </div>
        <div className="warning-text">
          ⚠️ <strong>Note</strong> - Les permissions sont maintenant gérées via
          l'interface d'administration.
        </div>
      </div>
    </div>
  )
}
