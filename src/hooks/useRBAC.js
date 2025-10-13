// src/hooks/useRBAC.js
/**
 * Hook unifié RBAC (Role-Based Access Control)
 *
 * Combine usePermissions + useQuotas + useEntitlements en une seule API cohérente
 *
 * @example
 * const { role, can, canAll, canCreateTask, quotaInfo } = useRBAC()
 *
 * Phase 2 - Refactoring RBAC
 * Élimine la duplication entre useQuotas et useEntitlements
 * Fournit une API unifiée pour toutes les vérifications RBAC
 */

import { usePermissions } from '@/contexts/PermissionsContext'
import { useMemo } from 'react'

export default function useRBAC() {
  // Phase 2.1 - Structure squelette
  // TODO Phase 2.2 - Implémenter la logique complète

  const permissions = usePermissions()

  // API publique du hook (sera complétée en Phase 2.2)
  const rbac = useMemo(() => {
    return {
      // === Permissions (depuis PermissionsContext) ===
      ready: permissions.ready,
      loading: permissions.loading,
      role: permissions.role,

      // Flags de rôle
      isVisitor: permissions.isVisitor,
      isAdmin: permissions.isAdmin,
      isUnknown: permissions.isUnknown,

      // Fonctions de vérification
      can: permissions.can,
      canAll: permissions.canAll,
      canAny: permissions.canAny,

      // === Quotas (TODO Phase 2.2) ===
      // quotas, usage, canCreateTask, canCreateReward, etc.

      // === Entitlements (TODO Phase 2.2) ===
      // features, subscription, etc.

      // Reload
      reload: permissions.reload,
    }
  }, [permissions])

  return rbac
}
