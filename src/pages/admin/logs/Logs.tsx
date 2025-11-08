// src/pages/admin/logs/Logs.tsx
import { Button, FloatingPencil } from '@/components'
import { usePermissions, useToast } from '@/contexts'
import { supabase } from '@/utils/supabaseClient'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Logs.scss'

interface SubscriptionLog {
  id: string
  timestamp: string
  user_id: string | null
  event_type: string
  details: Record<string, unknown>
}

type FilterType = 'all' | 'user' | 'system' | 'event:webhook' | 'event:checkout'

export default function Logs() {
  const { role: _role, isAdmin, loading: permissionsLoading } = usePermissions()
  const { show: showToast } = useToast()
  const navigate = useNavigate()

  const [logs, setLogs] = useState<SubscriptionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const ITEMS_PER_PAGE = 50

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    if (permissionsLoading) return

    if (!isAdmin) {
      showToast('Accès non autorisé', 'error')
      navigate('/profil')
      return
    }
  }, [isAdmin, permissionsLoading, navigate, showToast])

  // Charger les logs
  const loadLogs = useCallback(
    async (reset = false) => {
      if (!isAdmin || permissionsLoading) return

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
          setLogs((data as SubscriptionLog[]) || [])
          setPage(0)
        } else {
          setLogs(prev => [...prev, ...((data as SubscriptionLog[]) || [])])
        }

        setTotalCount(count || 0)
        setHasMore(
          ((data as SubscriptionLog[]) || []).length === ITEMS_PER_PAGE
        )
      } catch (error) {
        console.error('Erreur chargement logs:', error)
        showToast('Erreur lors du chargement des logs', 'error')
      } finally {
        setLoading(false)
      }
    },
    [isAdmin, permissionsLoading, page, showToast]
  )

  useEffect(() => {
    if (isAdmin) {
      loadLogs(true)
    }
  }, [isAdmin, loadLogs])

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter)
    loadLogs(true)
  }

  const loadMore = () => {
    if (!hasMore || loading) return
    setPage(prev => prev + 1)
    loadLogs()
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/\./g, ' → ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const getUserInfo = (userId: string | null) => {
    if (!userId) return 'Système'
    return userId.slice(0, 8) + '...'
  }

  if (permissionsLoading) {
    return (
      <div className="logs-page">
        <h1>Logs d&apos;abonnement</h1>
        <p>Chargement des permissions...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="logs-page">
        <h1>Logs d&apos;abonnement</h1>
        <p>Accès non autorisé. Redirection en cours...</p>
      </div>
    )
  }

  return (
    <div className="logs-page">
      <h1>Logs d&apos;abonnement</h1>

      <FloatingPencil className="floating-pencil--logs" />

      {/* Filtres */}
      <div className="logs-filters">
        <h3>Filtres</h3>
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
        <h3>Logs récents</h3>

        {logs.length === 0 && !loading ? (
          <p className="no-logs">Aucun log trouvé</p>
        ) : (
          <div className="logs-table">
            <div className="logs-header">
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

      {/* Navigation */}
      <div className="logs-footer">
        <Button
          onClick={() => navigate('/profil')}
          label="← Retour au profil"
          variant="secondary"
        />
      </div>
    </div>
  )
}
