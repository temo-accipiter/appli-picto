import { InputWithValidation } from '@/components'
import { createRoleValidationRules, updateRoleValidationRules } from '@/utils/validationRules'
import { Check, Edit, Plus, Shield, Trash2 } from 'lucide-react'

export default function RolesTab({
  manageableRoles,
  newRole,
  setNewRole,
  editingRole,
  setEditingRole,
  handleCreateRole,
  handleUpdateRole,
  handleDeleteRole
}) {
  return (
    <div className="roles-tab">
      <h2>Gestion des Rôles</h2>
      <p>Créez, modifiez et supprimez des rôles utilisateur.</p>

      {/* Note sur le rôle admin */}
      <div className="admin-note">
        <Shield className="icon" aria-hidden />
        <p>
          <strong>Note :</strong> Le rôle <code>admin</code> est un rôle
          système qui ne peut pas être modifié. Il a automatiquement accès
          à toutes les fonctionnalités.
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
            onChange={(value) => setNewRole({ ...newRole, name: value })}
            onValid={(value) => setNewRole({ ...newRole, name: value })}
            rules={createRoleValidationRules.name(newRole.name, manageableRoles)}
            ariaLabel="Nom du rôle"
          />
          <InputWithValidation
            id="new-role-display-name"
            label="Nom d'affichage"
            placeholder="ex: Abonné Pro"
            value={newRole.display_name}
            onChange={(value) => setNewRole({ ...newRole, display_name: value })}
            onValid={(value) => setNewRole({ ...newRole, display_name: value })}
            rules={createRoleValidationRules.displayName(newRole.display_name)}
            ariaLabel="Nom d'affichage du rôle"
          />
          <InputWithValidation
            id="new-role-description"
            label="Description"
            placeholder="Description du rôle"
            value={newRole.description}
            onChange={(value) => setNewRole({ ...newRole, description: value })}
            onValid={(value) => setNewRole({ ...newRole, description: value })}
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

      {/* Liste des rôles */}
      <div className="roles-list">
        {manageableRoles.map(role => (
          <div key={role.id} className="role-card">
            <div className="role-info">
              <h4>{role.display_name}</h4>
              <span className={`role-badge ${role.name}`}>
                {role.name}
              </span>
              {role.description && <p>{role.description}</p>}
            </div>

            <div className="role-actions">
              {editingRole === role.id ? (
                <div className="edit-form">
                  <InputWithValidation
                    id={`edit-role-${role.id}`}
                    label="Nom d'affichage"
                    placeholder="Nouveau nom d'affichage"
                    value={role.display_name}
                    onChange={(value) => {
                      // Mettre à jour temporairement l'état local
                      const updatedRole = { ...role, display_name: value }
                      setEditingRole(role.id)
                      // Ici on pourrait mettre à jour un état temporaire
                    }}
                    onValid={(value) => {
                      // Validation réussie, on peut sauvegarder
                      handleUpdateRole(role.id, { display_name: value })
                    }}
                    rules={updateRoleValidationRules.displayName(role.display_name)}
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
                  <button
                    className="btn btn-primary"
                    onClick={() => setEditingRole(role.id)}
                  >
                    <Edit size={16} />
                    Modifier
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteRole(role.id)}
                  >
                    <Trash2 size={16} />
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
