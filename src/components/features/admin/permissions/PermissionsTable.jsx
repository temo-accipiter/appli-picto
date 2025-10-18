import { ButtonDelete } from '@/components'
import { Edit, Save, Settings, X } from 'lucide-react'
import PropTypes from 'prop-types'
import { getPermissionDescription } from './permissionUtils'

export default function PermissionsTable({
  features,
  manageableRoles,
  permissions,
  tempPermissions,
  editingPermissions,
  setEditingPermissions,
  handlePermissionChange,
  handleSavePermissions,
  handleDeleteFeature,
  handleEditFeature,
  initializeTempPermissions,
}) {
  return (
    <div className="permissions-table-container">
      <table className="permissions-table">
        <thead>
          <tr>
            <th className="feature-header">Fonctionnalités</th>
            {manageableRoles.map(role => (
              <th key={role.id} className="role-header">
                <div className="role-info">
                  <span className="role-name">{role.display_name}</span>
                  <small className="role-description">{role.description}</small>
                </div>
              </th>
            ))}
            <th className="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {features.map(feature => (
            <tr key={feature.id} className="permission-row">
              <td className="feature-cell">
                <div className="feature-info">
                  <strong>{feature.display_name}</strong>
                  <small>{feature.description}</small>
                </div>
              </td>
              {manageableRoles.map(role => {
                const currentPermissions =
                  editingPermissions === role.id ? tempPermissions : permissions
                const hasPermission = currentPermissions.some(
                  p =>
                    p.role_id === role.id &&
                    p.feature_id === feature.id &&
                    p.can_access
                )

                return (
                  <td
                    key={`${role.id}-${feature.id}`}
                    className="permission-cell"
                  >
                    {editingPermissions === role.id ? (
                      <div className="permission-controls">
                        <div className="permission-control">
                          <label className="permission-label">
                            <input
                              type="checkbox"
                              checked={hasPermission}
                              onChange={event =>
                                handlePermissionChange(
                                  role.id,
                                  feature.id,
                                  'can_access',
                                  event.target.checked
                                )
                              }
                              disabled={role.name === 'admin'}
                              aria-label={`Accès à ${feature.display_name} pour ${role.display_name}`}
                            />
                            <span className="permission-text">Accès</span>
                          </label>
                        </div>

                        <div className="permission-note">
                          <small>{getPermissionDescription(feature)}</small>
                        </div>
                      </div>
                    ) : (
                      <div className="permission-status">
                        <span
                          className={`status ${hasPermission ? 'enabled' : 'disabled'}`}
                        >
                          {hasPermission ? '✅' : '❌'}
                        </span>
                      </div>
                    )}
                  </td>
                )
              })}
              <td className="feature-actions">
                <div className="feature-action-buttons">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEditFeature(feature)}
                    title="Modifier cette fonctionnalité"
                  >
                    <Settings size={14} />
                  </button>
                  <ButtonDelete
                    onClick={() => handleDeleteFeature(feature)}
                    title="Supprimer cette fonctionnalité"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="actions-header">Actions</td>
            {manageableRoles.map(role => (
              <td key={role.id} className="role-actions">
                {editingPermissions === role.id ? (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => handleSavePermissions(role.id)}
                      disabled={role.name === 'admin'}
                    >
                      <Save size={16} />
                      Enregistrer
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditingPermissions(null)}
                    >
                      <X size={16} />
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      initializeTempPermissions(role.id)
                      setEditingPermissions(role.id)
                    }}
                    disabled={role.name === 'admin'}
                  >
                    <Edit size={16} />
                    Modifier
                  </button>
                )}
              </td>
            ))}
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

PermissionsTable.propTypes = {
  features: PropTypes.array,
  manageableRoles: PropTypes.array,
  permissions: PropTypes.array,
  tempPermissions: PropTypes.object,
  editingPermissions: PropTypes.bool,
  setEditingPermissions: PropTypes.func,
  handlePermissionChange: PropTypes.func,
  handleSavePermissions: PropTypes.func,
  handleDeleteFeature: PropTypes.func,
  handleEditFeature: PropTypes.func,
  initializeTempPermissions: PropTypes.func,
}
