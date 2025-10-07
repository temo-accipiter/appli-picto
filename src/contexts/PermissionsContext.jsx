// src/contexts/PermissionsContext.jsx
// Détection des rôles robuste + permissions.
// - Attend que l’auth soit prête (AuthContext.authReady).
// - Ne considère JAMAIS "visitor" tant que ready=false → rôle "unknown" temporaire.
// - RPC avec retry exponentiel pour absorber les races au démarrage.
// - Exporte des flags pratiques : isUnknown, isVisitor, isAdmin.

import PropTypes from 'prop-types'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '@/utils/supabaseClient'
import { ROLE, normalizeRoleName } from '@/utils/roleUtils'
import { AuthContext } from './AuthContext'

export const PermissionsContext = createContext(null)

// --- Utils --------------------------------------------------------------

function extractRoleName(payload) {
  if (!payload) return ''
  const candidate =
    payload.role_name ?? payload.role ?? payload.rolename ?? payload.name ?? ''
  return normalizeRoleName(candidate)
}

function toPermissionMap(rows = []) {
  const map = Object.create(null)
  for (const r of rows) {
    const rawName = r.feature_name ?? r.name ?? r.feature ?? r.code ?? ''
    const key = String(rawName).trim()
    const allowed =
      typeof r.can_access === 'boolean'
        ? r.can_access
        : typeof r.allowed === 'boolean'
          ? r.allowed
          : !!r.enabled
    if (key) map[key] = !!allowed
  }
  return map
}

// Erreurs transitoires courantes quand le token n’est pas prêt
const TRANSIENT_ERR_CODES = new Set([
  'AuthSessionMissingError',
  'JWTInvalid',
  'PGRST301',
  'PGRST302',
])

async function retryUntilStable(
  fn,
  { attempts = 5, delays = [0, 200, 400, 800, 1600] } = {}
) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      if (delays[i]) await new Promise(r => setTimeout(r, delays[i]))
      return await fn()
    } catch (e) {
      lastErr = e
      const code = e?.code || e?.name
      if (!TRANSIENT_ERR_CODES.has(code)) break // erreur non transitoire → on stoppe
    }
  }
  throw lastErr
}

// --- Provider -----------------------------------------------------------

export const PermissionsProvider = ({ children }) => {
  const { user, authReady } = useContext(AuthContext)

  const [ready, setReady] = useState(false)
  const [role, setRole] = useState('unknown')
  const [permissions, setPermissions] = useState({})
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)

    // 1) Tant que l’auth n’est pas prête, on reste en "unknown"
    if (!authReady) {
      setReady(false)
      setRole('unknown')
      setPermissions({})
      return
    }

    // 2) Pas d’utilisateur → visitor
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
          rErr.code ||= rErr?.name
          throw rErr
        }
        if (pErr) {
          pErr.code ||= pErr?.name
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
      // En cas d’erreur "réelle", on termine en ready=true pour éviter de bloquer l’UI.
      if (import.meta.env.DEV) console.warn('[Permissions] load error:', e)
      setError(e)
      setRole('unknown')
      setPermissions({})
      setReady(true)
    }
  }, [authReady, user])

  // Chargement initial + sur changements d’auth
  useEffect(() => {
    let mounted = true
    ;(async () => {
      await load()
      if (!mounted) return
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      try {
        await load()
      } catch {
        /* déjà loggé */
      }
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [load])

  const can = useCallback(
    featureName => {
      if (!featureName) return false
      if (!ready) return false
      if (role === ROLE.ADMIN) return true
      return !!permissions[String(featureName)]
    },
    [permissions, ready, role]
  )

  const value = useMemo(
    () => ({
      ready, // TRUE quand une décision est prise
      role, // 'unknown' | 'visitor' | 'user' | 'admin' | …
      isUnknown: role === 'unknown',
      isVisitor: ready && role === ROLE.VISITOR,
      isAdmin: ready && role === ROLE.ADMIN, // ✅ exposé pour UserMenu & co
      permissions,
      error,
      can,
      reload: load,
    }),
    [ready, role, permissions, error, can, load]
  )

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

PermissionsProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

// Hook pratique
export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx)
    throw new Error('usePermissions must be used within a PermissionsProvider')
  return ctx
}

export default PermissionsProvider
