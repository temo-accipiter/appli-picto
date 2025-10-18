import { InputWithValidation } from '@/components'
import {
  canDeleteRole,
  canModifyRole,
  getRoleDescription,
  getRoleDisplayName,
  isSystemRole,
  sortRolesByPriority,
} from '@/utils/roleUtils'
import {
  createRoleValidationRules,
  updateRoleValidationRules,
} from '@/utils/validationRules'
import {
  Check,
  Edit,
  Plus,
  Shield,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react'
import PropTypes from 'prop-types'

export default function RolesTab({
  roles,
  newRole,
  setNewRole,
  editingRole,
  setEditingRole,
  handleCreateRole,
  handleUpdateRole,
  handleDeleteRole,
  handleToggleRole,
}) {
  // Séparer les rôles système des rôles personnalisés
  const systemRoles = roles.filter(role => isSystemRole(role.name))
  const customRoles = roles.filter(role => !isSystemRole(role.name))
  const sortedSystemRoles = sortRolesByPriority(systemRoles)

  return (
    <div className="roles-tab">
      <h2>Gestion des Rôles</h2>
      <p>Gérez les rôles système et créez des rôles personnalisés.</p>

      {/* Note sur les rôles système */}
      <div className="admin-note">
        <Shield className="icon" aria-hidden />
        <p>
          <strong>Note :</strong> Les rôles système (admin, visitor, free,
          abonne, staff) sont protégés et ne peuvent pas être supprimés. Vous
          pouvez les activer/désactiver selon vos besoins.
        </p>
      </div>

      {/* Formulaire de création */}
      <div className="create-role-form">
        <h3>Créer un nouveau rôle</h3>
        <div className="form-row">
          <InputWithValidation
            id="new-role-name"
            label="Nom du rôle"
            placeholder="ex: pro"
            value={newRole.name}
            onChange={value => setNewRole({ ...newRole, name: value })}
            onValid={value => setNewRole({ ...newRole, name: value })}
            rules={createRoleValidationRules.name(newRole.name, roles)}
            ariaLabel="Nom du rôle"
          />
          <InputWithValidation
            id="new-role-display-name"
            label="Nom d'affichage"
            placeholder="ex: Abonné Pro"
            value={newRole.display_name}
            onChange={value => setNewRole({ ...newRole, display_name: value })}
            onValid={value => setNewRole({ ...newRole, display_name: value })}
            rules={createRoleValidationRules.displayName(newRole.display_name)}
            ariaLabel="Nom d'affichage du rôle"
          />
          <InputWithValidation
            id="new-role-description"
            label="Description"
            placeholder="Description du rôle"
            value={newRole.description}
            onChange={value => setNewRole({ ...newRole, description: value })}
            onValid={value => setNewRole({ ...newRole, description: value })}
            rules={createRoleValidationRules.description(newRole.description)}
            ariaLabel="Description du rôle"
          />
          <button
            className="btn btn-success"
            onClick={handleCreateRole}
            disabled={!newRole.name || !newRole.display_name}
          >
            <Plus size={16} />
            Créer
          </button>
        </div>
      </div>

      {/* Rôles système */}
      <div className="roles-section">
        <h3>Rôles Système</h3>
        <div className="roles-list">
          {sortedSystemRoles.map(role => (
            <div
              key={role.id}
              className={`role-card system-role ${!role.is_active ? 'inactive' : ''}`}
            >
              <div className="role-info">
                <h4>{getRoleDisplayName(role)}</h4>
                <span className={`role-badge ${role.name}`}>{role.name}</span>
                <p>{getRoleDescription(role)}</p>
                <div className="role-status">
                  <span
                    className={`status-badge ${role.is_active ? 'active' : 'inactive'}`}
                  >
                    {role.is_active ? '✅ Actif' : '❌ Inactif'}
                  </span>
                </div>
              </div>

              <div className="role-actions">
                <button
                  className={`btn ${role.is_active ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => handleToggleRole(role.id, !role.is_active)}
                  title={
                    role.is_active ? 'Désactiver ce rôle' : 'Activer ce rôle'
                  }
                >
                  {role.is_active ? (
                    <>
                      <ToggleLeft size={16} />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <ToggleRight size={16} />
                      Activer
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rôles personnalisés */}
      <div className="roles-section">
        <h3>Rôles Personnalisés</h3>
        <div className="roles-list">
          {customRoles.map(role => (
            <div
              key={role.id}
              className={`role-card custom-role ${!role.is_active ? 'inactive' : ''}`}
            >
              <div className="role-info">
                <h4>{getRoleDisplayName(role)}</h4>
                <span className={`role-badge ${role.name}`}>{role.name}</span>
                <p>{getRoleDescription(role)}</p>
                <div className="role-status">
                  <span
                    className={`status-badge ${role.is_active ? 'active' : 'inactive'}`}
                  >
                    {role.is_active ? '✅ Actif' : '❌ Inactif'}
                  </span>
                </div>
              </div>

              <div className="role-actions">
                {editingRole === role.id ? (
                  <div className="edit-form">
                    <InputWithValidation
                      id={`edit-role-${role.id}`}
                      label="Nom d'affichage"
                      placeholder="Nouveau nom d'affichage"
                      value={role.display_name}
                      onChange={value => {
                        // Mettre à jour temporairement l'état local
                        const _updatedRole = { ...role, display_name: value }
                        setEditingRole(role.id)
                        // Ici on pourrait mettre à jour un état temporaire
                      }}
                      onValid={value => {
                        // Validation réussie, on peut sauvegarder
                        handleUpdateRole(role.id, { display_name: value })
                      }}
                      rules={updateRoleValidationRules.displayName(
                        role.display_name
                      )}
                      ariaLabel={`Modifier le nom d'affichage de ${role.display_name}`}
                    />
                    <button
                      className="btn btn-success"
                      onClick={() => setEditingRole(null)}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    {canModifyRole(role.name) && (
                      <button
                        className="btn btn-primary"
                        onClick={() => setEditingRole(role.id)}
                      >
                        <Edit size={16} />
                        Modifier
                      </button>
                    )}
                    {canDeleteRole(role.name) && (
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <Trash2 size={16} />
                        Supprimer
                      </button>
                    )}
                    <button
                      className={`btn ${role.is_active ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleRole(role.id, !role.is_active)}
                      title={
                        role.is_active
                          ? 'Désactiver ce rôle'
                          : 'Activer ce rôle'
                      }
                    >
                      {role.is_active ? (
                        <>
                          <ToggleLeft size={16} />
                          Désactiver
                        </>
                      ) : (
                        <>
                          <ToggleRight size={16} />
                          Activer
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {customRoles.length === 0 && (
            <div className="empty-state">
              <p>
                Aucun rôle personnalisé créé. Utilisez le formulaire ci-dessus
                pour en créer un.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

RolesTab.propTypes = {
  roles: PropTypes.array,
  newRole: PropTypes.object,
  setNewRole: PropTypes.func,
  editingRole: PropTypes.string,
  setEditingRole: PropTypes.func,
  handleCreateRole: PropTypes.func,
  handleUpdateRole: PropTypes.func,
  handleDeleteRole: PropTypes.func,
  handleToggleRole: PropTypes.func,
}
