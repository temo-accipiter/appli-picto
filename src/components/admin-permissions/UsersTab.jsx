import { InputWithValidation, ModalConfirm } from '@/components'
import { assignRoleToUser, getUsersWithRoles, removeRoleFromUser } from '@/utils/permissions-api'
import { Crown, Shield, UserMinus, UserPlus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Charger les utilisateurs au montage
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await getUsersWithRoles()
      
      if (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error)
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignRole = async (userId, roleId) => {
    try {
      const { error } = await assignRoleToUser(userId, roleId)
      
      if (error) {
        console.error('Erreur lors de l\'assignation du rôle:', error)
        alert('❌ Erreur lors de l\'assignation du rôle')
        return
      }

      // Recharger les utilisateurs
      await loadUsers()
      setShowAssignModal(false)
      setSelectedUser(null)
      
      console.log('✅ Rôle assigné avec succès')
    } catch (error) {
      console.error('Erreur lors de l\'assignation du rôle:', error)
      alert('❌ Erreur lors de l\'assignation du rôle')
    }
  }

  const handleRemoveRole = async (userId, roleId) => {
    try {
      const { error } = await removeRoleFromUser(userId, roleId)
      
      if (error) {
        console.error('Erreur lors de la suppression du rôle:', error)
        alert('❌ Erreur lors de la suppression du rôle')
        return
      }

      // Recharger les utilisateurs
      await loadUsers()
      setShowRemoveModal(false)
      setSelectedUser(null)
      
      console.log('✅ Rôle supprimé avec succès')
    } catch (error) {
      console.error('Erreur lors de la suppression du rôle:', error)
      alert('❌ Erreur lors de la suppression du rôle')
    }
  }

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'Administrateur',
      'abonne': 'Abonné',
      'visitor': 'Visiteur'
    }
    return roleNames[role.name] || role.display_name || role.name
  }

  const getRoleIcon = (roleName) => {
    switch (roleName) {
      case 'admin':
        return <Shield size={16} className="text-red-500" />
      case 'abonne':
        return <Crown size={16} className="text-yellow-500" />
      default:
        return <Users size={16} className="text-blue-500" />
    }
  }

  const filteredUsers = users.filter(user => 
    user.pseudo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="users-tab">
        <h2>Gestion des Utilisateurs</h2>
        <p>Assignez et gérez les rôles des utilisateurs.</p>
        <div className="loading-container">
          <p>Chargement des utilisateurs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="users-tab">
      <h2>Gestion des Utilisateurs</h2>
      <p>Assignez et gérez les rôles des utilisateurs.</p>

      {/* Barre de recherche */}
      <div className="search-container">
        <InputWithValidation
          id="user-search"
          label="Rechercher un utilisateur"
          placeholder="Pseudo ou email..."
          value={searchTerm}
          onChange={setSearchTerm}
          onValid={setSearchTerm}
          rules={[]}
          ariaLabel="Rechercher un utilisateur"
        />
      </div>

      {/* Liste des utilisateurs */}
      <div className="users-list">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <Users size={48} className="icon" />
            <h3>Aucun utilisateur trouvé</h3>
            <p>Essayez de modifier votre recherche ou créez un nouvel utilisateur.</p>
          </div>
        ) : (
          filteredUsers.map(user => (
            <div key={user.id} className="user-card">
              <div className="user-info">
                <div className="user-header">
                  <h4>{user.pseudo || 'Sans pseudo'}</h4>
                  {user.is_admin && (
                    <span className="admin-badge">
                      <Shield size={14} />
                      Admin
                    </span>
                  )}
                </div>
                <p className="user-email">{user.email}</p>
                <p className="user-created">
                  Membre depuis le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="user-roles">
                <h5>Rôles assignés :</h5>
                {user.user_roles && user.user_roles.length > 0 ? (
                  <div className="roles-list">
                    {user.user_roles.map(userRole => (
                      <div key={userRole.id} className="role-item">
                        <span className="role-icon">
                          {getRoleIcon(userRole.roles?.name)}
                        </span>
                        <span className="role-name">
                          {getRoleDisplayName(userRole.roles)}
                        </span>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            setSelectedUser({ id: user.id, roleId: userRole.roles.id, userName: user.pseudo })
                            setShowRemoveModal(true)
                          }}
                          disabled={user.is_admin}
                        >
                          <UserMinus size={14} />
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-roles">Aucun rôle assigné</p>
                )}

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setSelectedUser({ id: user.id, userName: user.pseudo })
                    setShowAssignModal(true)
                  }}
                  disabled={user.is_admin}
                >
                  <UserPlus size={14} />
                  Assigner un rôle
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal d'assignation de rôle */}
      {showAssignModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Assigner un rôle à {selectedUser.userName}</h3>
            <div className="role-selection">
              <button
                className="role-option"
                onClick={() => handleAssignRole(selectedUser.id, 'visitor')}
              >
                <Users size={20} />
                <span>Visiteur</span>
                <small>Accès limité aux fonctionnalités de base</small>
              </button>
              <button
                className="role-option"
                onClick={() => handleAssignRole(selectedUser.id, 'abonne')}
              >
                <Crown size={20} />
                <span>Abonné</span>
                <small>Accès complet aux fonctionnalités premium</small>
              </button>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAssignModal(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression de rôle */}
      {showRemoveModal && selectedUser && (
        <ModalConfirm
          isOpen={showRemoveModal}
          onClose={() => setShowRemoveModal(false)}
          onConfirm={() => handleRemoveRole(selectedUser.id, selectedUser.roleId)}
          confirmLabel="Retirer le rôle"
          cancelLabel="Annuler"
        >
          Êtes-vous sûr de vouloir retirer le rôle de <strong>"{selectedUser.userName}"</strong> ?
          <br />
          <small>Cette action peut limiter l'accès de l'utilisateur à certaines fonctionnalités.</small>
        </ModalConfirm>
      )}
    </div>
  )
}
