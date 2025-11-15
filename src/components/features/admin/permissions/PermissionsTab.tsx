import { Shield } from 'lucide-react'
import PermissionsTable from './PermissionsTable'

interface Feature {
  id: string
  name: string
  display_name: string
  description?: string | null
  category?: string | null
}

interface Role {
  id: string
  name: string
  display_name: string
  priority: number | null
  description?: string | null
}

interface Permission {
  id: string
  role_id: string
  feature_id: string
  can_access: boolean
}

interface PermissionsTabProps {
  features: Feature[]
  manageableRoles: Role[]
  permissions: Permission[]
  tempPermissions: Permission[]
  editingPermissions: string | null
  setEditingPermissions: (roleId: string | null) => void
  handlePermissionChange: (
    roleId: string,
    featureId: string,
    field: string,
    value: boolean
  ) => void
  handleSavePermissions: (roleId: string) => void | Promise<void>
  handleDeleteFeature: (feature: Feature) => void | Promise<void>
  handleEditFeature: (feature: Feature) => void
  initializeTempPermissions: (roleId: string) => void
}

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
}: PermissionsTabProps) {
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
