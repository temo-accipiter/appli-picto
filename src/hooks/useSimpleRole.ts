// src/hooks/useSimpleRole.ts
// Objectif : fournir un accès ultra-simple au rôle courant
// → On lit désormais le rôle depuis PermissionsContext (source unique)

import { useContext, useMemo } from 'react'
import { PermissionsContext } from '@/contexts'
import { ROLE } from '@/utils/roleUtils'

interface UseSimpleRoleReturn {
  ready: boolean
  role: string
  isVisitor: boolean
  isUnknown: boolean
  isAdmin: boolean
  can: (featureName: string) => boolean
  reload: () => Promise<void>
}

export default function useSimpleRole(): UseSimpleRoleReturn {
  const ctx = useContext(PermissionsContext)

  // Protection : si le provider n'est pas monté
  const ready = !!ctx?.ready
  const role = ctx?.role ?? ROLE.VISITOR

  const value = useMemo(() => {
    return {
      ready,
      role,
      isVisitor: role === ROLE.VISITOR,
      isUnknown: role === 'unknown',
      isAdmin: role === ROLE.ADMIN,
      // pratique dans l'UI
      can: ctx?.can ?? (() => false),
      reload: ctx?.reload ?? (async () => {}),
    }
  }, [ready, role, ctx?.can, ctx?.reload])

  return value
}
