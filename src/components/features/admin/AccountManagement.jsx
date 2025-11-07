// src/components/admin/AccountManagement.jsx
import { usePermissions } from '@/contexts'
import { supabase } from '@/utils/supabaseClient'
import PropTypes from 'prop-types'
import { useEffect, useState, useMemo } from 'react'
import { useDebounce } from '@/hooks'
import './AccountManagement.scss'

/**
 * Composant de gestion des comptes pour les administrateurs
 * Permet de visualiser et modifier les états des comptes utilisateurs
 */
export default function AccountManagement({ className = '' }) {
  const { can } = usePermissions()

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Charger les utilisateurs
  useEffect(() => {
    if (!can('account_management')) return
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            `
            *,
            user_roles!inner(
              is_active,
              roles!inner(name, display_name, priority)
            )
          `
          )
          .order('created_at', { ascending: false })

        if (error) throw error

        // Traiter les données pour avoir un format plus simple
        const processedUsers = (data || []).map(user => {
          const activeRole = user.user_roles.find(ur => ur.is_active)
          return {
            ...user,
            role: activeRole?.roles?.name || 'visitor',
            roleDisplay: activeRole?.roles?.display_name || 'Visiteur',
          }
        })

        setUsers(processedUsers)
      } catch (error) {
        console.error('Erreur chargement utilisateurs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [can])

  // Filtrer les utilisateurs avec debounce et mémoïsation
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesFilter = filter === 'all' || user.account_status === filter
      const matchesSearch =
        debouncedSearchTerm === '' ||
        user.pseudo
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [users, filter, debouncedSearchTerm])

  // Changer l'état d'un compte
  const changeAccountStatus = async (userId, newStatus, reason = '') => {
    setActionLoading(true)
    try {
      const { error } = await supabase.functions.invoke(
        'change-account-status',
        {
          body: {
            target_user_id: userId,
            new_status: newStatus,
            reason: reason,
          },
        }
      )

      if (error) throw error

      // Rafraîchir la liste
      const { data, error: refreshError } = await supabase
        .from('profiles')
        .select(
          `
          *,
          user_roles!inner(
            is_active,
            roles!inner(name, display_name, priority)
          )
        `
        )
        .order('created_at', { ascending: false })

      if (refreshError) throw refreshError

      const processedUsers = (data || []).map(user => {
        const activeRole = user.user_roles.find(ur => ur.is_active)
        return {
          ...user,
          role: activeRole?.roles?.name || 'visitor',
          roleDisplay: activeRole?.roles?.display_name || 'Visiteur',
        }
      })

      setUsers(processedUsers)
      setSelectedUser(null)
    } catch (error) {
      console.error('Erreur changement état compte:', error)
    } finally {
      setActionLoading(false)
    }
  }

  // Obtenir l'affichage de l'état
  const getStatusDisplay = status => {
    switch (status) {
      case 'active':
        return { label: 'Actif', color: 'success', icon: '✅' }
      case 'suspended':
        return { label: 'Suspendu', color: 'error', icon: '⛔' }
      case 'deletion_scheduled':
        return { label: 'Suppression programmée', color: 'warning', icon: '🗑️' }
      case 'pending_verification':
        return { label: 'En attente', color: 'info', icon: '⏳' }
      default:
        return { label: 'Inconnu', color: 'default', icon: '❓' }
    }
  }

  if (loading) {
    return (
      <div className={`account-management loading ${className}`}>
        <div className="loading-spinner">⏳</div>
        <p>Chargement des comptes...</p>
      </div>
    )
  }

  // Vérifier les permissions
  if (!can('account_management')) {
    return (
      <div className={`account-management no-permission ${className}`}>
        <p>Vous n&apos;avez pas les permissions pour gérer les comptes.</p>
      </div>
    )
  }

  return (
    <div className={`account-management ${className}`}>
      <div className="account-header">
        <h2>Gestion des Comptes</h2>
        <p>Visualisez et gérez les états des comptes utilisateurs</p>
      </div>

      <div className="account-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Rechercher par pseudo ou email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-select">
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Tous les états</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
            <option value="deletion_scheduled">Suppression programmée</option>
            <option value="pending_verification">En attente</option>
          </select>
        </div>
      </div>

      <div className="users-list">
        {filteredUsers.map(user => {
          const statusDisplay = getStatusDisplay(user.account_status)
          return (
            <div key={user.id} className="user-card">
              <div className="user-info">
                <div className="user-avatar">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.pseudo}
                      loading="lazy"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {user.pseudo?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                <div className="user-details">
                  <h3 className="user-name">{user.pseudo || 'Sans pseudo'}</h3>
                  <p className="user-email">{user.email}</p>
                  <div className="user-meta">
                    <span className="user-role">{user.roleDisplay}</span>
                    <span className="user-created">
                      Inscrit le{' '}
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="user-status">
                <div className={`status-badge ${statusDisplay.color}`}>
                  <span className="status-icon">{statusDisplay.icon}</span>
                  <span className="status-label">{statusDisplay.label}</span>
                </div>
              </div>

              <div className="user-actions">
                <button
                  className="action-button"
                  onClick={() => setSelectedUser(user)}
                  disabled={actionLoading}
                >
                  Gérer
                </button>
              </div>
            </div>
          )
        })}

        {filteredUsers.length === 0 && (
          <div className="no-users">
            <p>Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      {/* Modal de gestion */}
      {selectedUser && (
        <div className="account-modal">
          <div className="modal-content">
            <h3>Gérer le compte de {selectedUser.pseudo}</h3>

            <div className="user-summary">
              <p>
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p>
                <strong>Rôle:</strong> {selectedUser.roleDisplay}
              </p>
              <p>
                <strong>État actuel:</strong>{' '}
                {getStatusDisplay(selectedUser.account_status).label}
              </p>
            </div>

            <div className="status-actions">
              <h4>Changer l&apos;état du compte</h4>

              <div className="action-buttons">
                <button
                  className="status-button success"
                  onClick={() =>
                    changeAccountStatus(
                      selectedUser.id,
                      'active',
                      'Réactivation par admin'
                    )
                  }
                  disabled={
                    actionLoading || selectedUser.account_status === 'active'
                  }
                >
                  ✅ Activer
                </button>

                <button
                  className="status-button error"
                  onClick={() =>
                    changeAccountStatus(
                      selectedUser.id,
                      'suspended',
                      'Suspension par admin'
                    )
                  }
                  disabled={
                    actionLoading || selectedUser.account_status === 'suspended'
                  }
                >
                  ⛔ Suspendre
                </button>

                <button
                  className="status-button warning"
                  onClick={() =>
                    changeAccountStatus(
                      selectedUser.id,
                      'deletion_scheduled',
                      'Suppression programmée par admin'
                    )
                  }
                  disabled={
                    actionLoading ||
                    selectedUser.account_status === 'deletion_scheduled'
                  }
                >
                  🗑️ Programmer suppression
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="close-button"
                onClick={() => setSelectedUser(null)}
                disabled={actionLoading}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

AccountManagement.propTypes = {
  className: PropTypes.string,
}
