'use client'

// src/pages/admin/logs/Logs.tsx
/**
 * Page admin : Logs d'abonnement.
 *
 * Règles S12 §8.10 :
 * - Guard déjà appliqué par AdminRoute (404 neutre, sans hint)
 * - Scope lecture : subscription_logs uniquement (RLS is_admin())
 * - Pas de redirect, pas de toast "accès refusé"
 */
import { Button, FloatingPencil } from '@/components'
import { useToast } from '@/contexts'
import formatErr from '@/utils/logs/formatErr'
import { supabase } from '@/utils/supabaseClient'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import './Logs.scss'

interface SubscriptionLog {
  id: string
  account_id: string | null
  event_type: string
  details: Record<string, unknown>
  created_at: string
}

type FilterType = 'all' | 'user' | 'system' | 'event:webhook' | 'event:checkout'

function getLoadLogsErrorMessage(error: unknown): string {
  const normalizedError = formatErr(error).toLowerCase()

  if (
    normalizedError.includes('failed to fetch') ||
    normalizedError.includes('network') ||
    normalizedError.includes('fetch')
  ) {
    return 'Impossible de charger les logs. Verifiez la connexion puis reessayez.'
  }

  return 'Impossible de charger les logs pour le moment. Reessayez.'
}

export default function Logs() {
  const { show: showToast } = useToast()
  const router = useRouter()

  const [logs, setLogs] = useState<SubscriptionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 50

  // Charger les logs — AdminRoute garantit que l'utilisateur est admin
  const loadLogs = useCallback(
    async (reset = false) => {
      try {
        setLoading(true)
        setErrorMessage(null)
        const currentPage = reset ? 0 : page

        // RLS is_admin() enforced côté DB — pas besoin de guard front
        const { data, error, count } = await supabase
          .from('subscription_logs')
          .select('id, account_id, event_type, details, created_at', {
            count: 'exact',
          })
          .order('created_at', { ascending: false })
          .range(
            currentPage * ITEMS_PER_PAGE,
            (currentPage + 1) * ITEMS_PER_PAGE - 1
          )

        if (error) {
          const message = getLoadLogsErrorMessage(error)
          console.error('Erreur chargement logs:', formatErr(error))
          if (reset) {
            setLogs([])
            setTotalCount(0)
          }
          setHasMore(false)
          setErrorMessage(message)
          showToast(message, 'error')
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
        const message = getLoadLogsErrorMessage(error)
        console.error('Erreur chargement logs:', formatErr(error))
        if (reset) {
          setLogs([])
          setTotalCount(0)
        }
        setHasMore(false)
        setErrorMessage(message)
        showToast(message, 'error')
      } finally {
        setLoading(false)
      }
    },
    [page, showToast]
  )

  // Chargement initial
  useEffect(() => {
    loadLogs(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

        {errorMessage && !loading && <p className="no-logs">{errorMessage}</p>}

        {logs.length === 0 && !loading && !errorMessage ? (
          <p className="no-logs">Aucun log trouvé</p>
        ) : logs.length > 0 ? (
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
                  {formatTimestamp(log.created_at)}
                </span>
                <span className="log-user">{getUserInfo(log.account_id)}</span>
                <span className="log-event">
                  {formatEventType(log.event_type)}
                </span>
                <span className="log-details">
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </span>
              </div>
            ))}
          </div>
        ) : null}

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
          onClick={() => router.push('/profil')}
          label="← Retour au profil"
          variant="secondary"
        />
      </div>
    </div>
  )
}
