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
import type { AuthError, PostgrestError } from '@supabase/supabase-js'
import type { PermissionsContextValue } from '@/types/contexts'
import type {
  GetMyPrimaryRoleResponse,
  GetMyPermissionsResponse,
} from '@/types/supabase-rpc'
import type { Role } from '@/types/global'
import { supabase } from '@/utils/supabaseClient'
import { ROLE, normalizeRoleName } from '@/utils/roleUtils'
import { AuthContext } from './AuthContext'

export const PermissionsContext = createContext<PermissionsContextValue | null>(
  null
)

// --- Utils --------------------------------------------------------------

function extractRoleName(payload: unknown): Role | '' {
  if (!payload || typeof payload !== 'object') return ''
  const p = payload as GetMyPrimaryRoleResponse
  const candidate = p.role_name ?? p.role ?? p.rolename ?? p.name ?? ''
  const normalized = normalizeRoleName(candidate)

  // Valider que le rôle retourné est un rôle valide
  const validRoles: Role[] = ['visitor', 'free', 'abonne', 'admin', 'unknown']
  if (validRoles.includes(normalized as Role)) {
    return normalized as Role
  }

  // Si le rôle n'est pas reconnu, retourner une chaîne vide
  return ''
}

function toPermissionMap(rows: unknown[] = []): Record<string, boolean> {
  const map: Record<string, boolean> = Object.create(null)
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const perm = r as GetMyPermissionsResponse
    const rawName = perm.feature_name ?? perm.name ?? perm.feature ?? perm.code ?? ''
    const key = String(rawName).trim()
    const allowed =
      typeof perm.can_access === 'boolean'
        ? perm.can_access
        : typeof perm.allowed === 'boolean'
          ? perm.allowed
          : !!perm.enabled
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

interface RetryOptions {
  attempts?: number
  delays?: number[]
}

async function retryUntilStable<T>(
  fn: () => Promise<T>,
  { attempts = 5, delays = [0, 200, 400, 800, 1600] }: RetryOptions = {}
): Promise<T> {
  let lastErr: Error | undefined
  for (let i = 0; i < attempts; i++) {
    try {
      if (delays[i]) await new Promise(r => setTimeout(r, delays[i]))
      return await fn()
    } catch (e) {
      lastErr = e as Error
      const code =
        (e as AuthError | PostgrestError)?.code || (e as Error)?.name
      if (!TRANSIENT_ERR_CODES.has(code)) break // erreur non transitoire → on stoppe
    }
  }
  throw lastErr
}

// --- Provider -----------------------------------------------------------

interface PermissionsProviderProps {
  children: ReactNode
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const authContext = useContext(AuthContext)
  if (!authContext) {
    throw new Error('PermissionsProvider must be used within AuthProvider')
  }
  const { user, authReady } = authContext

  const [ready, setReady] = useState<boolean>(false)
  const [role, setRole] = useState<Role>('unknown')
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
          throw rErr
        }
        if (pErr) {
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
