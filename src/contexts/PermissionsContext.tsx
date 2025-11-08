// src/contexts/PermissionsContext.tsx
// Détection des rôles robuste + permissions.
// - Attend que l'auth soit prête (AuthContext.authReady).
// - Ne considère JAMAIS "visitor" tant que ready=false → rôle "unknown" temporaire.
// - RPC avec retry exponentiel pour absorber les races au démarrage.
// - Exporte des flags pratiques : isUnknown, isVisitor, isAdmin.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/utils/supabaseClient'
import { ROLE, normalizeRoleName } from '@/utils/roleUtils'
import { AuthContext } from './AuthContext'

interface PermissionsContextValue {
  ready: boolean
  loading: boolean
  role: string
  isUnknown: boolean
  isVisitor: boolean
  isAdmin: boolean
  permissions: Record<string, boolean>
  error: Error | null
  can: (featureName: string) => boolean
  canAll: (featureNames: string[]) => boolean
  canAny: (featureNames: string[]) => boolean
  reload: () => Promise<void>
}

interface PermissionsProviderProps {
  children: ReactNode
}

interface RolePayload {
  role_name?: string
  role?: string
  rolename?: string
  name?: string
}

interface PermissionRow {
  feature_name?: string
  name?: string
  feature?: string
  code?: string
  can_access?: boolean
  allowed?: boolean
  enabled?: boolean | number
}

interface RetryOptions {
  attempts?: number
  delays?: number[]
}

export const PermissionsContext = createContext<PermissionsContextValue | null>(
  null
)

// --- Utils --------------------------------------------------------------

function extractRoleName(payload: unknown): string {
  if (!payload) return ''
  const rolePayload = payload as RolePayload
  const candidate =
    rolePayload.role_name ??
    rolePayload.role ??
    rolePayload.rolename ??
    rolePayload.name ??
    ''
  return normalizeRoleName(candidate)
}

function toPermissionMap(rows: unknown[] = []): Record<string, boolean> {
  const map = Object.create(null) as Record<string, boolean>
  for (const r of rows) {
    const permRow = r as PermissionRow
    const rawName =
      permRow.feature_name ??
      permRow.name ??
      permRow.feature ??
      permRow.code ??
      ''
    const key = String(rawName).trim()
    const allowed =
      typeof permRow.can_access === 'boolean'
        ? permRow.can_access
        : typeof permRow.allowed === 'boolean'
          ? permRow.allowed
          : !!permRow.enabled
    if (key) map[key] = !!allowed
  }
  return map
}

// Erreurs transitoires courantes quand le token n'est pas prêt
const TRANSIENT_ERR_CODES = new Set([
  'AuthSessionMissingError',
  'JWTInvalid',
  'PGRST301',
  'PGRST302',
])

async function retryUntilStable<T>(
  fn: () => Promise<T>,
  { attempts = 5, delays = [0, 200, 400, 800, 1600] }: RetryOptions = {}
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      if (delays[i]) await new Promise(r => setTimeout(r, delays[i]))
      return await fn()
    } catch (e) {
      lastErr = e
      const error = e as { code?: string; name?: string }
      const code = error?.code || error?.name
      if (!TRANSIENT_ERR_CODES.has(code || '')) break // erreur non transitoire → on stoppe
    }
  }
  throw lastErr
}

// --- Provider -----------------------------------------------------------

export const PermissionsProvider = ({ children }: PermissionsProviderProps) => {
  const authContext = useContext(AuthContext)
  if (!authContext) {
    throw new Error('PermissionsProvider must be used within an AuthProvider')
  }
  const { user, authReady } = authContext

  const [ready, setReady] = useState(false)
  const [role, setRole] = useState('unknown')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setError(null)

    // 1) Tant que l'auth n'est pas prête, on reste en "unknown"
    if (!authReady) {
      setReady(false)
      setRole('unknown')
      setPermissions({})
      return
    }

    // 2) Pas d'utilisateur → visitor
    if (!user) {
      setRole(ROLE.VISITOR)
      setPermissions({})
      setReady(true)
      return
    }

    // 3) Utilisateur présent → on récupère rôle + permissions avec retry
    try {
      const { roleRows, permRows } = await retryUntilStable(async () => {
        const [
          { data: roleRows, error: rErr },
          { data: permRows, error: pErr },
        ] = await Promise.all([
          supabase.rpc('get_my_primary_role'),
          supabase.rpc('get_my_permissions'),
        ])
        if (rErr) {
          const error = rErr as { code?: string; name?: string }
          error.code = error.code || error?.name
          throw rErr
        }
        if (pErr) {
          const error = pErr as { code?: string; name?: string }
          error.code = error.code || error?.name
          throw pErr
        }
        return { roleRows, permRows }
      })

      const primary = Array.isArray(roleRows) ? roleRows[0] : roleRows
      const normRole = extractRoleName(primary) || ROLE.VISITOR
      const permMap = toPermissionMap(permRows || [])

      setRole(normRole)
      setPermissions(permMap)
      setReady(true)
    } catch (e) {
      // En cas d'erreur "réelle", on termine en ready=true pour éviter de bloquer l'UI.
      if (import.meta.env.DEV) console.warn('[Permissions] load error:', e)
      setError(e as Error)
      setRole('unknown')
      setPermissions({})
      setReady(true)
    }
  }, [authReady, user])

  // Chargement initial + sur changements d'auth
  useEffect(() => {
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null
    let debounceTimer: number | undefined
    ;(async () => {
      await load()
      if (!mounted) return
    })()

    // ✅ CORRECTIF CRITIQUE : Débouncer les appels Supabase dans onAuthStateChange
    // Bug documenté : https://github.com/supabase/auth-js/issues/762
    // Async Supabase calls inside onAuthStateChange() cause getSession() to hang indefinitely
    const { data } = supabase.auth.onAuthStateChange((_event, _session) => {
      if (!mounted) return

      // ✅ Débounce : Ne pas appeler load() immédiatement
      // Attendre 100ms que le SDK se stabilise après le state change
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => {
        if (!mounted) return
        // ✅ Appel différé, hors du callback sync
        load().catch(() => {
          /* déjà loggé */
        })
      }, 100)
    })
    subscription = data?.subscription

    return () => {
      mounted = false
      if (debounceTimer) clearTimeout(debounceTimer)
      // ✅ Cleanup immédiat et synchrone du listener
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [load])

  const can = useCallback(
    (featureName: string) => {
      if (!featureName) return false
      if (!ready) return false
      if (role === ROLE.ADMIN) return true
      return !!permissions[String(featureName)]
    },
    [permissions, ready, role]
  )

  const canAll = useCallback(
    (featureNames: string[] = []) => {
      if (!ready) return false
      if (role === ROLE.ADMIN) return true
      return featureNames.every(name => !!permissions[String(name)])
    },
    [permissions, ready, role]
  )

  const canAny = useCallback(
    (featureNames: string[] = []) => {
      if (!ready) return false
      if (role === ROLE.ADMIN) return true
      return featureNames.some(name => !!permissions[String(name)])
    },
    [permissions, ready, role]
  )

  const value = useMemo<PermissionsContextValue>(
    () => ({
      ready, // TRUE quand une décision est prise
      loading: !ready, // Pour compatibilité avec FeatureGate
      role, // 'unknown' | 'visitor' | 'user' | 'admin' | …
      isUnknown: role === 'unknown',
      isVisitor: ready && role === ROLE.VISITOR,
      isAdmin: ready && role === ROLE.ADMIN, // ✅ exposé pour UserMenu & co
      permissions,
      error,
      can,
      canAll,
      canAny,
      reload: load,
    }),
    [ready, role, permissions, error, can, canAll, canAny, load]
  )

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

// Hook pratique
export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext)
  if (!ctx)
    throw new Error('usePermissions must be used within a PermissionsProvider')
  return ctx
}

export default PermissionsProvider
