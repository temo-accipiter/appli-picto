import { getPermissionHistory } from '@/utils/permissions-api'
import { Clock, Edit, History, Plus, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function HistoryTab() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [limit, setLimit] = useState(50)

  // Charger l'historique au montage
  useEffect(() => {
    loadHistory()
  }, [limit])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const { data, error } = await getPermissionHistory(limit)
      
      if (error) {
        console.error('Erreur lors du chargement de l\'historique:', error)
        return
      }

      setHistory(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChangeTypeIcon = (changeType) => {
    switch (changeType) {
      case 'INSERT':
        return <Plus size={16} className="text-green-500" />
      case 'UPDATE':
        return <Edit size={16} className="text-blue-500" />
      case 'DELETE':
        return <Trash2 size={16} className="text-red-500" />
      default:
        return <Edit size={16} className="text-gray-500" />
    }
  }

  const getChangeTypeLabel = (changeType) => {
    switch (changeType) {
      case 'INSERT':
        return 'Création'
      case 'UPDATE':
        return 'Modification'
      case 'DELETE':
        return 'Suppression'
      default:
        return changeType
    }
  }

  const getTableDisplayName = (tableName) => {
    const tableNames = {
      'roles': 'Rôles',
      'features': 'Fonctionnalités',
      'role_permissions': 'Permissions',
      'user_roles': 'Rôles utilisateurs'
    }
    return tableNames[tableName] || tableName
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true
    return item.change_type === filter
  })

  const getChangeDescription = (item) => {
    const tableName = getTableDisplayName(item.table_name)
    const changeType = getChangeTypeLabel(item.change_type)
    
    switch (item.table_name) {
      case 'roles':
        return `${changeType} du rôle "${item.new_values?.display_name || item.old_values?.display_name || 'Inconnu'}"`
      case 'features':
        return `${changeType} de la fonctionnalité "${item.new_values?.display_name || item.old_values?.display_name || 'Inconnu'}"`
      case 'role_permissions':
        return `${changeType} des permissions pour un rôle`
      case 'user_roles':
        return `${changeType} d'un rôle utilisateur`
      default:
        return `${changeType} dans ${tableName}`
    }
  }

  if (loading) {
    return (
      <div className="history-tab">
        <h2>Historique des Changements</h2>
        <p>Suivez tous les modifications apportées aux permissions.</p>
        <div className="loading-container">
          <p>Chargement de l'historique...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="history-tab">
      <h2>Historique des Changements</h2>
      <p>Suivez tous les modifications apportées aux permissions.</p>

      {/* Filtres et contrôles */}
      <div className="history-controls">
        <div className="filter-group">
          <label htmlFor="change-type-filter">Type de changement :</label>
          <select
            id="change-type-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-select"
          >
            <option value="all">Tous les changements</option>
            <option value="INSERT">Créations</option>
            <option value="UPDATE">Modifications</option>
            <option value="DELETE">Suppressions</option>
          </select>
        </div>

        <div className="limit-group">
          <label htmlFor="history-limit">Nombre d'éléments :</label>
          <select
            id="history-limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="form-select"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <button
          className="btn btn-secondary"
          onClick={loadHistory}
        >
          <Clock size={16} />
          Actualiser
        </button>
      </div>

      {/* Liste de l'historique */}
      <div className="history-list">
        {filteredHistory.length === 0 ? (
          <div className="no-history">
            <History size={48} className="icon" />
            <h3>Aucun changement trouvé</h3>
            <p>
              {filter === 'all' 
                ? 'Aucun changement n\'a encore été effectué dans le système.'
                : `Aucun changement de type "${getChangeTypeLabel(filter)}" trouvé.`
              }
            </p>
          </div>
        ) : (
          filteredHistory.map(item => (
            <div key={item.id} className="history-item">
              <div className="history-header">
                <div className="change-type">
                  {getChangeTypeIcon(item.change_type)}
                  <span className="change-label">
                    {getChangeTypeLabel(item.change_type)}
                  </span>
                </div>
                <div className="change-time">
                  <Clock size={14} />
                  {formatDate(item.changed_at)}
                </div>
              </div>

              <div className="change-content">
                <h4>{getChangeDescription(item)}</h4>
                
                <div className="change-details">
                  <div className="detail-row">
                    <strong>Table :</strong>
                    <span>{getTableDisplayName(item.table_name)}</span>
                  </div>
                  
                  {item.changed_by && (
                    <div className="detail-row">
                      <strong>Modifié par :</strong>
                      <span className="user-info">
                        <User size={14} />
                        {item.profiles?.pseudo || 'Utilisateur inconnu'}
                      </span>
                    </div>
                  )}

                  {item.old_values && (
                    <div className="detail-row">
                      <strong>Anciennes valeurs :</strong>
                      <pre className="values-preview">
                        {JSON.stringify(item.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {item.new_values && (
                    <div className="detail-row">
                      <strong>Nouvelles valeurs :</strong>
                      <pre className="values-preview">
                        {JSON.stringify(item.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Statistiques */}
      {filteredHistory.length > 0 && (
        <div className="history-stats">
          <h3>Statistiques</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <strong>Total des changements :</strong>
              <span>{filteredHistory.length}</span>
            </div>
            <div className="stat-item">
              <strong>Créations :</strong>
              <span>{filteredHistory.filter(h => h.change_type === 'INSERT').length}</span>
            </div>
            <div className="stat-item">
              <strong>Modifications :</strong>
              <span>{filteredHistory.filter(h => h.change_type === 'UPDATE').length}</span>
            </div>
            <div className="stat-item">
              <strong>Suppressions :</strong>
              <span>{filteredHistory.filter(h => h.change_type === 'DELETE').length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
