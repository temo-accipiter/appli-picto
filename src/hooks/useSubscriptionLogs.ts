// src/hooks/useSubscriptionLogs.ts
/**
 * Hook admin : Lecture paginée des logs d'abonnement avec filtres.
 *
 * Règles S12 §8.10 :
 * - Scope lecture uniquement : subscription_logs (RLS is_admin())
 * - Filtres appliqués côté DB (pas uniquement côté UI)
 * - Pagination par blocs de 50 entrées
 * - AbortController systématique
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike, useAccountStatus } from '@/hooks'

export interface SubscriptionLog {
  id: string
  account_id: string | null
  event_type: string
  details: Record<string, unknown>
  created_at: string
}

export type LogFilterType =
  | 'all'
  | 'user'
  | 'system'
  | 'event:webhook'
  | 'event:checkout'

const ITEMS_PER_PAGE = 50

interface UseSubscriptionLogsReturn {
  logs: SubscriptionLog[]
  loading: boolean
  error: string | null
  totalCount: number
  hasMore: boolean
  filter: LogFilterType
  setFilter: (f: LogFilterType) => void
  loadMore: () => void
  refresh: () => void
}

/**
 * Construit les filtres Supabase selon le type sélectionné.
 * Retourne la query modifiée.
 */
function applyFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filter: LogFilterType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  switch (filter) {
    case 'user':
      return query.not('account_id', 'is', null)
    case 'system':
      return query.is('account_id', null)
    case 'event:webhook':
      return query.ilike('event_type', '%webhook%')
    case 'event:checkout':
      return query.ilike('event_type', '%checkout%')
    default:
      return query
  }
}

export default function useSubscriptionLogs(): UseSubscriptionLogsReturn {
  const { isAdmin } = useAccountStatus()

  const [logs, setLogs] = useState<SubscriptionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilterState] = useState<LogFilterType>('all')
  const [page, setPage] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  // Référence stable de l'AbortController courant
  const controllerRef = useRef<AbortController | null>(null)

  const fetchLogs = useCallback(
    async (
      targetPage: number,
      currentFilter: LogFilterType,
      reset: boolean
    ) => {
      // Annuler la requête précédente si elle est encore en cours
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      if (!isAdmin) {
        setLogs([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('subscription_logs')
          .select('id, account_id, event_type, details, created_at', {
            count: 'exact',
          })
          .order('created_at', { ascending: false })
          .range(
            targetPage * ITEMS_PER_PAGE,
            (targetPage + 1) * ITEMS_PER_PAGE - 1
          )
          .abortSignal(controller.signal)

        query = applyFilter(query, currentFilter)

        const { data, error: fetchError, count } = await query

        if (controller.signal.aborted) return

        if (fetchError) {
          if (isAbortLike(fetchError)) return
          console.error(
            '[useSubscriptionLogs] Erreur lecture logs:',
            fetchError
          )
          setError(
            'Impossible de charger les logs. Vérifiez la connexion puis réessayez.'
          )
          if (reset) {
            setLogs([])
            setTotalCount(0)
          }
          setHasMore(false)
          return
        }

        const rows = (data as SubscriptionLog[]) ?? []

        if (reset) {
          setLogs(rows)
        } else {
          setLogs(prev => [...prev, ...rows])
        }

        setTotalCount(count ?? 0)
        setHasMore(rows.length === ITEMS_PER_PAGE)
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useSubscriptionLogs] Erreur inattendue:', err)
        setError('Impossible de charger les logs pour le moment. Réessayez.')
        if (reset) {
          setLogs([])
          setTotalCount(0)
        }
        setHasMore(false)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    },
    [isAdmin]
  )

  // Chargement initial + rechargement sur changement filter ou refreshKey
  useEffect(() => {
    setPage(0)
    void fetchLogs(0, filter, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, refreshKey, isAdmin])

  // Cleanup à la destruction
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  const setFilter = useCallback((newFilter: LogFilterType) => {
    setFilterState(newFilter)
    // Le useEffect ci-dessus réagit automatiquement au changement de filter
  }, [])

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    void fetchLogs(nextPage, filter, false)
  }, [hasMore, loading, page, filter, fetchLogs])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return {
    logs,
    loading,
    error,
    totalCount,
    hasMore,
    filter,
    setFilter,
    loadMore,
    refresh,
  }
}
