'use client'

// ⚠️ STUB TEMPORAIRE - Sera supprimé en S2+ (Admin + Metrics slice)
// Ce stub preserve l'interface usePermissions pour les composants admin (hors scope S1)

import { createContext, useContext, type ReactNode } from 'react'

type Role = 'visitor' | 'user' | 'abonne' | 'admin' | 'unknown'

interface PermissionsContextValue {
  role: Role
  isVisitor: boolean
  ready: boolean
  loading: boolean
  can: () => boolean
  isUnknown: boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  console.warn('[STUB] PermissionsProvider utilisé - S2+ requis pour fonctionnalité complète')
  
  const stubValue: PermissionsContextValue = {
    role: 'unknown',
    isVisitor: false,
    ready: true,
    loading: false,
    can: () => false,
    isUnknown: true,
  }

  return (
    <PermissionsContext.Provider value={stubValue}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}

export { PermissionsContext }
