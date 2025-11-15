/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPermissionHistory } from '@/utils/permissions-api'
import { Clock, Edit, History, Plus, Trash2, User } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE'
type TableName = 'roles' | 'features' | 'role_permissions' | 'user_roles'

interface HistoryValues {
  display_name?: string
  [key: string]: any
}

interface HistoryItem {
  id: string
  table_name: string
  change_type: string
  changed_at: string
  changed_by: string | null
  user_pseudo?: string | null
  old_values: HistoryValues | null
  new_values: HistoryValues | null
}

type ChangeTypeFilter = 'all' | ChangeType
type TableFilter = 'all' | TableName

export default function HistoryTab() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [changeTypeFilter, setChangeTypeFilter] =
    useState<ChangeTypeFilter>('all')
  const [tableFilter, setTableFilter] = useState<TableFilter>('all')
  const [limit, setLimit] = useState(50)

  // ✅ Déclarer loadHistory AVANT useEffect pour éviter la Temporal Dead Zone
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await getPermissionHistory(limit)

      if (error) {
        console.error("Erreur lors du chargement de l'historique:", error)
        return
      }

      setHistory(data || [])
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique:", error)
    } finally {
      setLoading(false)
    }
  }, [limit])

  // Charger l'historique au montage
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const getChangeTypeIcon = (changeType: string) => {
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

  const getChangeTypeLabel = (changeType: string): string => {
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

  const getTableDisplayName = (tableName: string): string => {
    const tableNames: Record<TableName, string> = {
      roles: 'Rôles',
      features: 'Fonctionnalités',
      role_permissions: 'Permissions des rôles',
      user_roles: 'Attributions de rôles',
    }
    return tableNames[tableName as TableName] || tableName
  }

  const getTableIcon = (tableName: string): string => {
    const icons: Record<TableName, string> = {
      roles: '👤',
      features: '⚙️',
      role_permissions: '🔐',
      user_roles: '🔗',
    }
    return icons[tableName as TableName] || '📋'
  }

  const getTableColor = (tableName: string): string => {
    const colors: Record<TableName, string> = {
      roles: '#3B82F6', // Bleu
      features: '#10B981', // Vert
      role_permissions: '#F59E0B', // Orange
      user_roles: '#8B5CF6', // Violet
    }
    return colors[tableName as TableName] || '#6B7280'
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredHistory = history.filter(item => {
    const changeTypeMatch =
      changeTypeFilter === 'all' || item.change_type === changeTypeFilter
    const tableMatch = tableFilter === 'all' || item.table_name === tableFilter
    return changeTypeMatch && tableMatch
  })

  const getChangeDescription = (item: HistoryItem): string => {
    const tableName = getTableDisplayName(item.table_name)
    const changeType = getChangeTypeLabel(item.change_type)

    switch (item.table_name) {
      case 'roles':
        return `${changeType} du rôle "${(item.new_values as any)?.display_name || (item.old_values as any)?.display_name || 'Inconnu'}"`
      case 'features':
        return `${changeType} de la fonctionnalité "${(item.new_values as any)?.display_name || (item.old_values as any)?.display_name || 'Inconnu'}"`
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
          <p>Chargement de l&apos;historique...</p>
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
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="change-type-filter">Type de changement :</label>
            <select
              id="change-type-filter"
              value={changeTypeFilter}
              onChange={e =>
                setChangeTypeFilter(e.target.value as ChangeTypeFilter)
              }
              className="form-select"
            >
              <option value="all">Tous les types</option>
              <option value="INSERT">Créations</option>
              <option value="UPDATE">Modifications</option>
              <option value="DELETE">Suppressions</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="table-filter">Type d&apos;élément :</label>
            <select
              id="table-filter"
              value={tableFilter}
              onChange={e => setTableFilter(e.target.value as TableFilter)}
              className="form-select"
            >
              <option value="all">Tous les éléments</option>
              <option value="roles">Rôles</option>
              <option value="features">Fonctionnalités</option>
              <option value="role_permissions">Permissions</option>
              <option value="user_roles">Attributions</option>
            </select>
          </div>

          <div className="limit-group">
            <label htmlFor="history-limit">Nombre d&apos;éléments :</label>
            <select
              id="history-limit"
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="form-select"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="action-group">
            <button className="btn btn-secondary" onClick={loadHistory}>
              <Clock size={16} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Liste de l'historique */}
      <div className="history-list">
        {filteredHistory.length === 0 ? (
          <div className="no-history">
            <History size={48} className="icon" />
            <h3>Aucun changement trouvé</h3>
            <p>
              {changeTypeFilter === 'all' && tableFilter === 'all'
                ? "Aucun changement n'a encore été effectué dans le système."
                : `Aucun changement trouvé avec les filtres sélectionnés.`}
            </p>
          </div>
        ) : (
          filteredHistory.map(item => (
            <div
              key={item.id}
              className={`history-item table-${item.table_name}`}
            >
              <div className="history-header">
                <div className="change-type">
                  <span
                    className="table-icon"
                    style={{ color: getTableColor(item.table_name) }}
                  >
                    {getTableIcon(item.table_name)}
                  </span>
                  {getChangeTypeIcon(item.change_type)}
                  <span className="change-label">
                    {getChangeTypeLabel(item.change_type)}
                  </span>
                  <span
                    className="table-label"
                    style={{ backgroundColor: getTableColor(item.table_name) }}
                  >
                    {getTableDisplayName(item.table_name)}
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
                  {item.changed_by && (
                    <div className="detail-row">
                      <strong>Modifié par :</strong>
                      <span className="user-info">
                        <User size={14} />
                        {item.user_pseudo || 'Utilisateur inconnu'}
                      </span>
                    </div>
                  )}

                  {item.old_values && (
                    <div className="detail-row">
                      <strong>Anciennes valeurs :</strong>
                      <pre className="values-preview old-values">
                        {JSON.stringify(item.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {item.new_values && (
                    <div className="detail-row">
                      <strong>Nouvelles valeurs :</strong>
                      <pre className="values-preview new-values">
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
              <span>
                {filteredHistory.filter(h => h.change_type === 'INSERT').length}
              </span>
            </div>
            <div className="stat-item">
              <strong>Modifications :</strong>
              <span>
                {filteredHistory.filter(h => h.change_type === 'UPDATE').length}
              </span>
            </div>
            <div className="stat-item">
              <strong>Suppressions :</strong>
              <span>
                {filteredHistory.filter(h => h.change_type === 'DELETE').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
