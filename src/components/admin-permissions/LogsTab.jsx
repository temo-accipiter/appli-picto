// src/components/admin-permissions/LogsTab.jsx
import { Button } from '@/components'
import { useToast } from '@/contexts'
import { supabase } from '@/utils'
import { useCallback, useEffect, useState } from 'react'

export default function LogsTab() {
  const { show: showToast } = useToast()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const ITEMS_PER_PAGE = 50

  // Charger les logs
  const loadLogs = useCallback(
    async (reset = false) => {
      try {
        setLoading(true)
        const currentPage = reset ? 0 : page

        // Utiliser la fonction is_admin() de Supabase pour les permissions RLS
        const { data, error, count } = await supabase
          .from('subscription_logs')
          .select('*', { count: 'exact' })
          .order('timestamp', { ascending: false })
          .range(
            currentPage * ITEMS_PER_PAGE,
            (currentPage + 1) * ITEMS_PER_PAGE - 1
          )

        if (error) {
          console.error('Erreur chargement logs:', error)
          showToast(
            `Erreur lors du chargement des logs: ${error.message}`,
            'error'
          )
          return
        }

        if (reset) {
          setLogs(data || [])
          setPage(0)
        } else {
          setLogs(prev => [...prev, ...(data || [])])
        }

        setTotalCount(count || 0)
        setHasMore((data || []).length === ITEMS_PER_PAGE)
      } catch (error) {
        console.error('Erreur chargement logs:', error)
        showToast('Erreur lors du chargement des logs', 'error')
      } finally {
        setLoading(false)
      }
    },
    [page, showToast]
  )

  useEffect(() => {
    loadLogs(true)
  }, [loadLogs])

  const handleFilterChange = newFilter => {
    setFilter(newFilter)
    loadLogs(true)
  }

  const loadMore = () => {
    if (!hasMore || loading) return
    setPage(prev => prev + 1)
    loadLogs()
  }

  const formatTimestamp = timestamp => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatEventType = eventType => {
    return eventType
      .replace(/\./g, ' → ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const getUserInfo = userId => {
    if (!userId) return 'Système'
    return userId.slice(0, 8) + '...'
  }

  return (
    <div className="logs-tab">
      <div className="logs-header">
        <h3>Logs d&apos;abonnement</h3>
        <p>Surveillez l&apos;activité des abonnements et des utilisateurs</p>
      </div>

      {/* Filtres */}
      <div className="logs-filters">
        <h4>Filtres</h4>
        <div className="filter-buttons">
          <Button
            onClick={() => handleFilterChange('all')}
            label="Tous"
            variant={filter === 'all' ? 'primary' : 'secondary'}
          />
          <Button
            onClick={() => handleFilterChange('user')}
            label="Utilisateurs"
            variant={filter === 'user' ? 'primary' : 'secondary'}
          />
          <Button
            onClick={() => handleFilterChange('system')}
            label="Système"
            variant={filter === 'system' ? 'primary' : 'secondary'}
          />
          <Button
            onClick={() => handleFilterChange('event:webhook')}
            label="Webhooks"
            variant={
              filter.startsWith('event:webhook') ? 'primary' : 'secondary'
            }
          />
          <Button
            onClick={() => handleFilterChange('event:checkout')}
            label="Checkout"
            variant={
              filter.startsWith('event:checkout') ? 'primary' : 'secondary'
            }
          />
        </div>

        <div className="filter-info">
          <p>Total : {totalCount} logs</p>
          <Button
            onClick={() => loadLogs(true)}
            label="🔄 Actualiser"
            variant="secondary"
            disabled={loading}
          />
        </div>
      </div>

      {/* Liste des logs */}
      <div className="logs-list">
        <h4>Logs récents</h4>

        {logs.length === 0 && !loading ? (
          <p className="no-logs">Aucun log trouvé</p>
        ) : (
          <div className="logs-table">
            <div className="logs-table-header">
              <span>Timestamp</span>
              <span>Utilisateur</span>
              <span>Événement</span>
              <span>Détails</span>
            </div>

            {logs.map(log => (
              <div key={log.id} className="log-row">
                <span className="log-timestamp">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className="log-user">{getUserInfo(log.user_id)}</span>
                <span className="log-event">
                  {formatEventType(log.event_type)}
                </span>
                <span className="log-details">
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </span>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="load-more">
            <Button
              onClick={loadMore}
              label={loading ? 'Chargement...' : 'Charger plus'}
              variant="secondary"
              disabled={loading}
            />
          </div>
        )}
      </div>
    </div>
  )
}
