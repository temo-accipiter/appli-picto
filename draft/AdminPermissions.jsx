import { InputWithValidation, Loader, ModalConfirm, Navbar } from '@/components'
import { usePermissions } from '@/contexts'
import { createRoleValidationRules, updateRoleValidationRules } from '@/utils/validationRules'
import {
  Check,
  Edit,
  History,
  Plus,
  Save,
  Settings,
  Shield,
  Trash2,
  Users,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import './AdminPermissions.scss'

export default function AdminPermissions() {
  const { 
    loading, 
    isAdmin, 
    permissions, 
    features, 
    roles,
    createRole,
    updateRole,
    deleteRole,
    updateRolePermissions,
    loadAllData
  } = usePermissions()
  const [activeTab, setActiveTab] = useState('permissions')
  
  // États locaux pour les formulaires
  const [editingRole, setEditingRole] = useState(null)
  const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '' })
  const [editingPermissions, setEditingPermissions] = useState(null)
  
  // État pour la confirmation de suppression
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    roleId: null,
    roleName: ''
  })
  
  // État local pour les permissions temporaires (modifications en cours)
  const [tempPermissions, setTempPermissions] = useState([])

  // Charger les données au montage du composant
  useEffect(() => {
    if (isAdmin) {
      loadAllData()
    }
  }, [isAdmin, loadAllData])
  
  // Initialiser les permissions temporaires quand les données sont chargées
  useEffect(() => {
    if (permissions && permissions.length > 0) {
      setTempPermissions([...permissions])
    }
  }, [permissions])

  // Attendre que TOUT soit chargé avant de décider
  const isLoading = loading || !isAdmin || !permissions || !features || !roles
  const hasLoadedData = !loading && isAdmin !== undefined && permissions && features && roles

  if (isLoading) {
    return (
      <div className="admin-permissions-page">
        <Navbar />
        <div className="loading-container">
          <Loader />
          <p>Chargement de l'administration...</p>
        </div>
      </div>
    )
  }

  // Rediriger les non-admins SEULEMENT après le chargement complet
  if (hasLoadedData && !isAdmin) {
    return <Navigate to="/" replace />
  }

  // Si les données ne sont pas encore chargées, continuer à attendre
  if (!hasLoadedData) {
    return (
      <div className="admin-permissions-page">
        <Navbar />
        <div className="loading-container">
          <Loader />
          <p>Vérification des permissions...</p>
        </div>
      </div>
    )
  }

  // Filtrer les rôles pour exclure admin (qui a tous les droits)
  const manageableRoles = roles.filter(role => role.name !== 'admin')

  // Gérer la création d'un nouveau rôle
  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.display_name) return

    const result = await createRole({
      ...newRole,
      priority: roles.length + 1,
    })

    if (!result.error) {
      setNewRole({ name: '', display_name: '', description: '' })
      await loadAllData()
    }
  }

  // Gérer la mise à jour d'un rôle
  const handleUpdateRole = async (roleId, updates) => {
    const result = await updateRole(roleId, updates)
    if (!result.error) {
      setEditingRole(null)
      await loadAllData()
    }
  }

  // Gérer la suppression d'un rôle
  const handleDeleteRole = async roleId => {
    const role = roles.find(r => r.id === roleId)
    if (role) {
      setConfirmDelete({
        isOpen: true,
        roleId: roleId,
        roleName: role.display_name
      })
    }
  }

  // Confirmer la suppression d'un rôle
  const confirmDeleteRole = async () => {
    if (confirmDelete.roleId) {
      await deleteRole(confirmDelete.roleId)
      await loadAllData()
      setConfirmDelete({ isOpen: false, roleId: null, roleName: '' })
    }
  }

  // Gérer le changement d'une permission (approche unifiée)
  const handlePermissionChange = (roleId, featureId, permissionType, checked) => {
    console.log('🔄 Changement de permission:', { roleId, featureId, permissionType, checked })
    
    // Trouver la permission existante ou en créer une nouvelle
    let permission = tempPermissions.find(p => p.role_id === roleId && p.feature_id === featureId)
    
    if (!permission) {
      // Créer une nouvelle permission (approche unifiée)
      permission = {
        role_id: roleId,
        feature_id: featureId,
        can_access: false // Seul droit nécessaire
      }
      console.log('➕ Nouvelle permission créée (unifiée):', permission)
      // Ajouter à la liste des permissions temporaires
      setTempPermissions(prev => [...prev, permission])
    }

    // Mettre à jour la permission existante
    const updatedPermission = {
      ...permission,
      [permissionType]: checked
    }
    console.log('✏️ Permission mise à jour (unifiée):', updatedPermission)
    
    // Mettre à jour la liste des permissions temporaires
    setTempPermissions(prev => 
      prev.map(p => 
        p.role_id === roleId && p.feature_id === featureId 
          ? updatedPermission 
          : p
      )
    )
    
    console.log('📋 tempPermissions après modification:', tempPermissions)
  }

  // Helper pour obtenir la description d'une permission
  const getPermissionDescription = (feature) => {
    const descriptions = {
      'confetti': 'Effet visuel des confettis lors de la complétion des tâches',
      'change_language': 'Sélecteur de langue de l\'interface',
      'theme_toggle': 'Basculement entre thème clair et sombre',
      'upload_images': 'Interface d\'upload d\'images',
      'create_tasks': 'Création de nouvelles tâches',
      'read_tasks': 'Visualisation des tâches existantes',
      'update_tasks': 'Modification des tâches existantes',
      'delete_tasks': 'Suppression des tâches',
      'create_rewards': 'Création de nouvelles récompenses',
      'read_rewards': 'Visualisation des récompenses existantes',
      'update_rewards': 'Modification des récompenses existantes',
      'delete_rewards': 'Suppression des récompenses',
      'create_categories': 'Création de nouvelles catégories',
      'read_categories': 'Visualisation des catégories existantes',
      'update_categories': 'Modification des catégories existantes',
      'delete_categories': 'Suppression des catégories'
    };
    
    return descriptions[feature.name] || `Accès à la fonctionnalité ${feature.display_name}`;
  };

  // Gérer la sauvegarde des permissions d'un rôle
  const handleSavePermissions = async roleId => {
    try {
      // Récupérer toutes les permissions pour ce rôle depuis l'état temporaire
      const rolePermissions = tempPermissions.filter(p => p.role_id === roleId)

      // Mettre à jour les permissions en base
      const result = await updateRolePermissions(roleId, rolePermissions)

      if (!result.error) {
        setEditingPermissions(null)
        // Recharger les données pour s'assurer de la cohérence
        await loadAllData()
        console.log('✅ Permissions sauvegardées avec succès')
      } else {
        console.error('❌ Erreur lors de la sauvegarde:', result.error)
        alert('Erreur lors de la sauvegarde des permissions')
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde des permissions')
    }
  }

  return (
    <div className="admin-permissions-page">
      <Navbar />
      <div className="admin-header">
        <h1>
          <Settings className="icon" aria-hidden />
          Administration des Permissions
        </h1>
        <p>
          Gérez les rôles, permissions et utilisateurs de votre application.
          Tous les changements sont sauvegardés en base de données.
        </p>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          <Shield className="icon" aria-hidden />
          Permissions
        </button>
        <button
          className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <Users className="icon" aria-hidden />
          Rôles
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="icon" aria-hidden />
          Utilisateurs
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="icon" aria-hidden />
          Historique
        </button>
      </div>

      <div className="tab-content">
        {/* Onglet Permissions */}
        {activeTab === 'permissions' && (
          <div className="permissions-tab">
            <h2>Gestion des Permissions par Rôle</h2>
            <p>Configurez les accès aux fonctionnalités pour chaque rôle.</p>

            {/* Note sur le rôle admin */}
            <div className="admin-note">
              <Shield className="icon" aria-hidden />
              <p>
                <strong>Note :</strong> Le rôle <code>admin</code> a
                automatiquement accès à toutes les fonctionnalités et ne peut pas
                être modifié.
              </p>
            </div>

            {/* Tableau unique des permissions */}
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
                        // Utiliser tempPermissions en mode édition, permissions sinon
                        const currentPermissions = editingPermissions === role.id ? tempPermissions : permissions
                        const hasPermission = currentPermissions.some(
                          p => p.role_id === role.id && p.feature_id === feature.id && p.can_access
                        )
                        
                        // Dans l'approche unifiée, on n'a besoin que de can_access

                        return (
                          <td key={`${role.id}-${feature.id}`} className="permission-cell">
                            {editingPermissions === role.id ? (
                              <div className="permission-controls">
                                {/* Droit d'accès principal */}
                                <div className="permission-control">
                                  <label className="permission-label">
                                    <input
                                      type="checkbox"
                                      checked={hasPermission}
                                      onChange={(event) => handlePermissionChange(role.id, feature.id, 'can_access', event.target.checked)}
                                      disabled={role.name === 'admin'}
                                      aria-label={`Accès à ${feature.display_name} pour ${role.display_name}`}
                                    />
                                    <span className="permission-text">Accès</span>
                                  </label>
                                </div>
                                
                                {/* Note explicative */}
                                <div className="permission-note">
                                  <small>
                                    {getPermissionDescription(feature)}
                                  </small>
                                </div>
                              </div>
                            ) : (
                              <div className="permission-status">
                                <span className={`status ${hasPermission ? 'enabled' : 'disabled'}`}>
                                  {hasPermission ? '✅' : '❌'}
                                </span>
                              </div>
                            )}
                          </td>
                        )
                      })}
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
                              onClick={() => {
                                setEditingPermissions(null)
                                // Réinitialiser les permissions temporaires avec les données originales
                                setTempPermissions([...permissions])
                              }}
                            >
                              <X size={16} />
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-primary"
                            onClick={() => setEditingPermissions(role.id)}
                            disabled={role.name === 'admin'}
                          >
                            <Edit size={16} />
                            Modifier
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Informations de debug */}
            <div className="debug-info">
              <h3>Informations de debug</h3>
              <p>
                <strong>Rôles chargés :</strong> {roles.length} |{' '}
                <strong>Fonctionnalités :</strong> {features.length} |{' '}
                <strong>Permissions :</strong> {permissions.length}
              </p>
            </div>
          </div>
        )}

        {/* Onglet Rôles */}
        {activeTab === 'roles' && (
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
                  rules={createRoleValidationRules.name(newRole.name, roles)}
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
        )}

        {/* Onglet Utilisateurs */}
        {activeTab === 'users' && (
          <div className="users-tab">
            <h2>Gestion des Utilisateurs</h2>
            <p>Assignez et gérez les rôles des utilisateurs.</p>

            <div className="users-list">
              {/* Ici nous ajouterons la gestion des utilisateurs */}
              <p>Fonctionnalité en cours de développement...</p>
            </div>
          </div>
        )}

        {/* Onglet Historique */}
        {activeTab === 'history' && (
          <div className="history-tab">
            <h2>Historique des Changements</h2>
            <p>Suivez tous les modifications apportées aux permissions.</p>

            <div className="history-list">
              {/* Ici nous ajouterons l'historique des changements */}
              <p>Fonctionnalité en cours de développement...</p>
            </div>
          </div>
        )}
      </div>

      {/* Debug info */}
      <div className="debug-info">
        <details>
          <summary>Debug: État des données</summary>
          <pre>
            {JSON.stringify(
              {
                roles: roles?.length || 0,
                features: features?.length || 0,
                permissions: permissions?.length || 0,
                manageableRoles: manageableRoles?.length || 0,
                loading: loading,
                isAdmin: isAdmin,
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>

      {/* Modal de confirmation de suppression */}
      <ModalConfirm
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, roleId: null, roleName: '' })}
        onConfirm={confirmDeleteRole}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
      >
        Êtes-vous sûr de vouloir supprimer le rôle <strong>"{confirmDelete.roleName}"</strong> ?
        <br />
        <small>Cette action est irréversible et supprimera toutes les permissions associées à ce rôle.</small>
      </ModalConfirm>
    </div>
  )
}
