import { Shield } from 'lucide-react'
import PropTypes from 'prop-types'
import PermissionsTable from './PermissionsTable'

export default function PermissionsTab({
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
    <div className="permissions-tab">
      {/* Note sur le rôle admin */}
      <div className="admin-note">
        <Shield className="icon" aria-hidden />
        <p>
          <strong>Note :</strong> Le rôle <code>admin</code> a automatiquement
          accès à toutes les fonctionnalités et ne peut pas être modifié.
        </p>
      </div>

      {/* Tableau des permissions */}
      <PermissionsTable
        features={features}
        manageableRoles={manageableRoles}
        permissions={permissions}
        tempPermissions={tempPermissions}
        editingPermissions={editingPermissions}
        setEditingPermissions={setEditingPermissions}
        handlePermissionChange={handlePermissionChange}
        handleSavePermissions={handleSavePermissions}
        handleDeleteFeature={handleDeleteFeature}
        handleEditFeature={handleEditFeature}
        initializeTempPermissions={initializeTempPermissions}
      />

      {/* Informations de debug */}
      <div className="debug-info">
        <h3>Informations de debug</h3>
        <p>
          <strong>Rôles chargés :</strong> {manageableRoles.length} |{' '}
          <strong>Fonctionnalités :</strong> {features.length} |{' '}
          <strong>Permissions :</strong> {permissions.length}
        </p>
      </div>
    </div>
  )
}

PermissionsTab.propTypes = {
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
