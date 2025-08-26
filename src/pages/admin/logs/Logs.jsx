// src/pages/admin/logs/Logs.jsx
import { Button, FloatingPencil } from '@/components'
import { useToast } from '@/contexts'
import { useAuth } from '@/hooks'
import { supabase } from '@/utils'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Logs.scss'

export default function Logs() {
  const { user } = useAuth()
  const { show: showToast } = useToast()
  const navigate = useNavigate()

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const ITEMS_PER_PAGE = 50

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Erreur vérification admin:', error)
        return
      }

      if (!data?.is_admin) {
        showToast('Accès non autorisé', 'error')
        navigate('/profil')
        return
      }

      setIsAdmin(true)
    }

    checkAdminStatus()
  }, [user, navigate, showToast])

  // Charger les logs
  const loadLogs = useCallback(
    async (reset = false) => {
      if (!isAdmin) return

      try {
        setLoading(true)
        const currentPage = reset ? 0 : page

        let query = supabase
          .from('subscription_logs')
          .select('*', { count: 'exact' })
          .order('timestamp', { ascending: false })
          .range(
            currentPage * ITEMS_PER_PAGE,
            (currentPage + 1) * ITEMS_PER_PAGE - 1
          )

        // Appliquer les filtres
        if (filter !== 'all') {
          if (filter === 'user') {
            query = query.not('user_id', 'is', null)
          } else if (filter === 'system') {
            query = query.is('user_id', null)
          } else if (filter.startsWith('event:')) {
            const eventType = filter.replace('event:', '')
            query = query.ilike('event_type', `%${eventType}%`)
          }
        }

        const { data, error, count } = await query

        if (error) throw error

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
    [isAdmin, page, filter, showToast]
  )

  useEffect(() => {
    if (isAdmin) {
      loadLogs(true)
    }
  }, [isAdmin, loadLogs])

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

  if (!user) {
    return (
      <div className="logs-page">
        <h1>Logs d&apos;abonnement</h1>
        <p>Chargement en cours...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="logs-page">
        <h1>Logs d&apos;abonnement</h1>
        <p>Vérification des permissions...</p>
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
