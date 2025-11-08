// src/hooks/useUserTimezone.ts
import { supabase } from '@/utils/supabaseClient'
import { useEffect, useMemo, useState } from 'react'

interface TimezoneCache {
  timezone: string
  updated_at: string
}

interface UseUserTimezoneReturn {
  timezone: string
  loading: boolean
  toLocal: (date: string | number | Date) => Date
  format: (
    date: string | number | Date,
    options?: Intl.DateTimeFormatOptions
  ) => string
}

// Petite clé de cache localStorage par utilisateur
const storageKey = (userId: string) => `tz:${userId}`

function useUserTimezone(): UseUserTimezoneReturn {
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchTz() {
      setLoading(true)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user ?? null
      if (!user) {
        if (!cancelled) {
          setTimezone('Europe/Paris')
          setLoading(false)
        }
        return
      }

      const currentUserId = user.id
      const cachedUserId = localStorage.getItem('current_user_id')
      if (cachedUserId && cachedUserId !== currentUserId) {
        localStorage.removeItem(storageKey(cachedUserId))
        localStorage.removeItem('quotas:' + cachedUserId)
      }
      localStorage.setItem('current_user_id', currentUserId)

      const cached = localStorage.getItem(storageKey(user.id))
      if (cached && !cancelled) {
        try {
          const parsed: TimezoneCache = JSON.parse(cached)
          if (parsed?.timezone) setTimezone(parsed.timezone)
        } catch {
          /* ignore */
        }
      }

      const { data, error } = await supabase
        .from('user_prefs')
        .select('timezone, updated_at')
        .eq('user_id', user.id)
        .single()

      if (!cancelled) {
        if (error) console.warn('useUserTimezone/read error:', error.message)
        const tz = data?.timezone || 'Europe/Paris'
        setTimezone(tz)
        setLoading(false)

        try {
          localStorage.setItem(
            storageKey(user.id),
            JSON.stringify({
              timezone: tz,
              updated_at: data?.updated_at || new Date().toISOString(),
            })
          )
        } catch {
          /* ignore */
        }
      }
    }

    fetchTz()
    return () => {
      cancelled = true
    }
  }, [])

  const helpers = useMemo(() => {
    const toLocal = (date: string | number | Date): Date =>
      typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date

    const format = (
      date: string | number | Date,
      options: Intl.DateTimeFormatOptions = {}
    ): string => {
      const d =
        typeof date === 'string' || typeof date === 'number'
          ? new Date(date)
          : date
      const fmt = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
        ...options,
      })
      return fmt.format(d)
    }

    return { toLocal, format }
  }, [timezone])

  return { timezone, loading, ...helpers }
}

export default useUserTimezone
