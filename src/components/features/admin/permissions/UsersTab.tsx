/* eslint-disable @typescript-eslint/no-explicit-any */
import { InputWithValidation, ModalConfirm } from '@/components'
import { useDebounce } from '@/hooks'
import {
  assignRoleToUser,
  getUsersWithRoles,
  removeRoleFromUser,
  getRoles,
} from '@/utils/permissions-api'
import { Crown, Shield, UserMinus, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Role {
  id: string
  name: string
  display_name?: string
}

interface UserRole {
  id: string
  roles: Role
}

interface User {
  id: string
  pseudo?: string
  email?: string
  created_at: string
  last_login?: string
  is_admin: boolean
  is_online: boolean
  account_status: string
  user_roles: UserRole[]
}

interface Pagination {
  page: number
  totalPages: number
  total: number
}

interface Stats {
  total: number
  admins: number
  withRoles: number
  online: number
}

interface SelectedUser {
  id: string
  userName?: string
  roleId?: string
}

interface RolesMap {
  [key: string]: string
}

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // États pour la pagination et les filtres
  const [currentPage, setCurrentPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  // NEW — map des rôles { name -> id } pour traduire 'visitor' / 'abonne' en UUID
  const [rolesMap, setRolesMap] = useState<RolesMap | null>(null)

  // Charger les utilisateurs au montage et quand les filtres changent
  useEffect(() => {
    loadUsers()
  }, [currentPage, roleFilter, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Charger la map des rôles une seule fois
  useEffect(() => {
    ;(async () => {
      const { data, error } = await getRoles()
      if (!error && Array.isArray(data)) {
        const map: RolesMap = Object.create(null)
        data.forEach((r: any) => {
          if (r?.name && r?.id) map[r.name] = r.id
        })
        setRolesMap(map)
      }
    })()
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const options = {
        page: currentPage,
        limit: 20,
        roleFilter,
        statusFilter,
      }

      const {
        data,
        error,
        pagination: paginationData,
      } = await getUsersWithRoles(options)

      if (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error)
        return
      }

      setUsers(data || [])
      setPagination(paginationData)

      // Calculer les statistiques
      if (data) {
        const userStats: Stats = {
          total: paginationData?.total || 0,
          admins: data.filter((u: User) => u.is_admin).length,
          withRoles: data.filter(
            (u: User) => u.user_roles && u.user_roles.length > 0
          ).length,
          online: data.filter((u: User) => u.is_online).length,
        }
        setStats(userStats)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, roleFilter, statusFilter])

  const handleAssignRole = async (userId: string, roleIdOrName: string) => {
    try {
      // 👇 Compat : si on reçoit un NOM ('visitor'/'abonne'), on le mappe vers l'UUID
      let roleId = roleIdOrName
      const looksLikeUuid =
        typeof roleIdOrName === 'string' && roleIdOrName.length > 30

      if (!looksLikeUuid) {
        const idFromName = rolesMap?.[roleIdOrName]
        if (!idFromName) {
          alert(`Rôle introuvable: ${roleIdOrName}`)
          return
        }
        roleId = idFromName
      }

      const { error } = await assignRoleToUser(userId, roleId)

      if (error) {
        console.error("Erreur lors de l'assignation du rôle:", error)
        alert("❌ Erreur lors de l'assignation du rôle")
        return
      }

      // Recharger les utilisateurs
      await loadUsers()
      setShowAssignModal(false)
      setSelectedUser(null)

      console.log('✅ Rôle assigné avec succès')
    } catch (error) {
      console.error("Erreur lors de l'assignation du rôle:", error)
      alert("❌ Erreur lors de l'assignation du rôle")
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
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

  const getRoleDisplayName = (role: Role): string => {
    const roleNames: Record<string, string> = {
      admin: 'Administrateur',
      abonne: 'Abonné',
      visitor: 'Visiteur',
    }
    return roleNames[role.name] || role.display_name || role.name
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return <Shield size={16} className="text-red-500" />
      case 'abonne':
        return <Crown size={16} className="text-yellow-500" />
      default:
        return <Users size={16} className="text-blue-500" />
    }
  }

  // ✅ Debounce la recherche pour éviter trop de filtres pendant la saisie
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const filteredUsers = useMemo(
    () =>
      users.filter(
        user =>
          user.pseudo
            ?.toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      ),
    [users, debouncedSearchTerm]
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

      {/* Statistiques */}
      {stats && (
        <div className="users-stats">
          <div className="stat-item">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.admins}</span>
            <span className="stat-label">Admins</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.online}</span>
            <span className="stat-label">En ligne</span>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="filters-container">
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="role-filter">Filtrer par rôle :</label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={e => {
                setRoleFilter(e.target.value)
                setCurrentPage(1) // Reset à la première page
              }}
              className="filter-select"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateurs</option>
              <option value="abonne">Abonnés</option>
              <option value="staff">Staff</option>
              <option value="free">Comptes gratuits</option>
              <option value="visitor">Visiteurs</option>
              <option value="no_roles">Sans rôles</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="status-filter">Statut du compte :</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setCurrentPage(1) // Reset à la première page
              }}
              className="filter-select"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
              <option value="pending_verification">En attente</option>
              <option value="deletion_scheduled">Suppression programmée</option>
            </select>
          </div>
        </div>

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
      </div>

      {/* Liste des utilisateurs */}
      <div className="users-list">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <Users size={48} className="icon" />
            <h3>Aucun utilisateur trouvé</h3>
            <p>
              Essayez de modifier votre recherche ou créez un nouvel
              utilisateur.
            </p>
          </div>
        ) : (
          filteredUsers.map(user => (
            <div
              key={user.id}
              className={`user-card ${user.is_admin ? 'admin-user' : 'regular-user'}`}
            >
              <div className="user-info">
                <div className="user-header">
                  <div className="user-title">
                    <h4>{user.pseudo || 'Sans pseudo'}</h4>
                    <div className="status-indicators">
                      {user.is_online && (
                        <span className="status-indicator online">
                          ● En ligne
                        </span>
                      )}
                      {user.account_status !== 'active' && (
                        <span
                          className={`account-status status-${user.account_status}`}
                        >
                          {user.account_status === 'suspended' && '⚠️ Suspendu'}
                          {user.account_status === 'deletion_scheduled' &&
                            '🗑️ Suppression programmée'}
                          {user.account_status === 'pending_verification' &&
                            '⏳ En attente'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="role-header">
                    <h5>Rôle :</h5>
                    {user.user_roles && user.user_roles.length > 0 ? (
                      <div className="roles-list">
                        {user.user_roles.map(userRole => (
                          <div
                            key={userRole.id}
                            className="role-item"
                            data-role={userRole.roles?.name}
                          >
                            <span className="role-icon">
                              {getRoleIcon(userRole.roles?.name)}
                            </span>
                            <span className="role-name">
                              {getRoleDisplayName(userRole.roles)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-roles">Aucun rôle assigné</p>
                    )}
                  </div>
                </div>

                <div className="user-content">
                  <div className="user-details">
                    <p className="user-email">
                      {user.email ? (
                        <>
                          <span className="email-label">Email :</span>{' '}
                          {user.email}
                        </>
                      ) : (
                        <span className="no-email">Email non disponible</span>
                      )}
                    </p>
                    <p className="user-created">
                      Membre depuis le{' '}
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="user-last-login">
                      {user.last_login ? (
                        <>
                          <span className="login-label">
                            Dernière connexion :
                          </span>
                          <span
                            className={`login-time ${user.is_online ? 'online' : 'offline'}`}
                          >
                            {new Date(user.last_login).toLocaleDateString(
                              'fr-FR'
                            )}{' '}
                            à{' '}
                            {new Date(user.last_login).toLocaleTimeString(
                              'fr-FR',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </span>
                        </>
                      ) : (
                        <span className="no-login">Jamais connecté</span>
                      )}
                    </p>
                  </div>

                  {/* Boutons d'action positionnés à droite */}
                  <div className="user-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSelectedUser({ id: user.id, userName: user.pseudo || 'Sans pseudo' })
                        setShowAssignModal(true)
                      }}
                      disabled={user.is_admin}
                      title={
                        user.is_admin
                          ? 'Un administrateur a déjà tous les droits'
                          : 'Assigner un rôle'
                      }
                    >
                      <UserPlus size={14} />
                      Assigner un rôle
                    </button>

                    {user.user_roles && user.user_roles.length > 0 && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          // Pour l'instant, on retire le premier rôle trouvé
                          const firstRole = user.user_roles[0]
                          if (firstRole) {
                            setSelectedUser({
                              id: user.id,
                              roleId: firstRole.roles.id,
                              userName: user.pseudo || 'Sans pseudo',
                            })
                            setShowRemoveModal(true)
                          }
                        }}
                        disabled={user.is_admin}
                        title={
                          user.is_admin
                            ? 'Un administrateur ne peut pas retirer son propre rôle admin'
                            : 'Retirer un rôle'
                        }
                      >
                        <UserMinus size={14} />
                        Retirer un rôle
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Page {pagination.page} sur {pagination.totalPages}(
            {pagination.total} utilisateurs au total)
          </div>

          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ← Précédent
            </button>

            <div className="pagination-pages">
              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  const pageNum =
                    Math.max(
                      1,
                      Math.min(pagination.totalPages - 4, currentPage - 2)
                    ) + i
                  if (pageNum > pagination.totalPages) return null

                  return (
                    <button
                      key={pageNum}
                      className={`pagination-page ${pageNum === currentPage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                }
              )}
            </div>

            <button
              className="pagination-btn"
              onClick={() =>
                setCurrentPage(prev =>
                  Math.min(pagination.totalPages, prev + 1)
                )
              }
              disabled={currentPage === pagination.totalPages}
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

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
          onConfirm={() =>
            handleRemoveRole(selectedUser.id, selectedUser.roleId!)
          }
          confirmLabel="Retirer le rôle"
          cancelLabel="Annuler"
        >
          Êtes-vous sûr de vouloir retirer le rôle de{' '}
          <strong>&quot;{selectedUser.userName}&quot;</strong> ?
          <br />
          <small>
            Cette action peut limiter l&apos;accès de l&apos;utilisateur à
            certaines fonctionnalités.
          </small>
        </ModalConfirm>
      )}
    </div>
  )
}
