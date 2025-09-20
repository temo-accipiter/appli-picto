/*
import { useEntitlements } from '@/hooks/useEntitlements'
import { usePermissionsAPI } from '@/hooks/usePermissionsAPI'
import { createContext, useContext, useMemo } from 'react'
import { AuthContext } from './AuthContext'

const PermissionsContext = createContext()

export const PermissionsProvider = ({ children }) => {
  const entitlements = useEntitlements()
  const {
    permissions,
    features,
    roles,
    loading: permissionsLoading,
    isLoading,
    createRole,
    updateRole,
    deleteRole,
    updateRolePermissions,
    createFeature,
    updateFeature,
    deleteFeature,
    loadAllData,
  } = usePermissionsAPI()

  /**
   * Vérifie si l'utilisateur a accès à une fonctionnalité
   * @param {string} featureName - Nom de la fonctionnalité
   * @returns {boolean}
   *
  const can = useMemo(() => {
    return featureName => {
      if (!entitlements.role || entitlements.role === 'admin') {
        return true // Admin a accès à tout
      }

      // Debug logging supprimé pour réduire le spam

      // Trouver la fonctionnalité
      const feature = features.find(f => f.name === featureName)
      if (!feature) {
        console.log('❌ Fonctionnalité non trouvée:', featureName)
        return false
      }

      // Trouver le rôle par son nom
      const userRole = roles.find(r => r.name === entitlements.role)
      if (!userRole) {
        console.log('❌ Rôle utilisateur non trouvé:', entitlements.role)
        return false
      }

      // Trouver la permission pour ce rôle et cette fonctionnalité
      const permission = permissions.find(
        p => p.feature_id === feature.id && p.role_id === userRole.id
      )

      // Log de permission supprimé pour réduire le spam

      return permission?.can_access || false
    }
  }, [entitlements.role, permissions, features, roles])

  /**
   * Vérifie si l'utilisateur a accès à plusieurs fonctionnalités
   * @param {string[]} featureNames - Liste des fonctionnalités
   * @returns {boolean}
   *
  const canAll = useMemo(() => {
    return featureNames => {
      return featureNames.every(feature => can(feature))
    }
  }, [can])

  /**
   * Vérifie si l'utilisateur a accès à au moins une fonctionnalité
   * @param {string[]} featureNames - Liste des fonctionnalités
   * @returns {boolean}
   *
  const canAny = useMemo(() => {
    return featureNames => {
      return featureNames.some(feature => can(feature))
    }
  }, [can])

  // Calculer l'état de chargement global
  // Debug logging détaillé (seulement en développement)
  if (import.meta.env.DEV) {
    console.log('🔍 PermissionsContext Debug:', {
      entitlements: {
        role: entitlements.role,
        loading: entitlements.loading,
        userId: entitlements.userId,
      },
      permissions: {
        count: permissions.length,
        data: permissions.slice(0, 3), // Premières 3 permissions pour debug
      },
      features: {
        count: features.length,
        data: features.slice(0, 3), // Premières 3 fonctionnalités pour debug
      },
      roles: {
        count: roles.length,
        data: roles.slice(0, 3), // Premiers 3 rôles pour debug
      },
      loading: {
        entitlements: entitlements.loading,
        permissions: permissionsLoading.isLoading,
        api: isLoading,
      },
    })
  }

  // Vérifier si l'utilisateur est connecté (seulement si pas en cours de chargement ET que l'auth a fini de charger)
  const { loading: authLoading } = useContext(AuthContext)
  if (!entitlements.loading && !authLoading && !entitlements.userId) {
    console.warn('⚠️ Utilisateur non connecté - userId undefined')
  }

  const globalLoading =
    entitlements.loading || permissionsLoading.isLoading || isLoading

  const value = {
    ...entitlements,
    can,
    canAll,
    canAny,
    permissions,
    features,
    roles,
    loading: globalLoading,
    // Fonctions de gestion
    createRole,
    updateRole,
    deleteRole,
    updateRolePermissions,
    createFeature,
    updateFeature,
    deleteFeature,
    loadAllData,
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export const usePermissions = () => {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error(
      'usePermissions doit être utilisé dans un PermissionsProvider'
    )
  }
  return context
}
*/
import { useAccountStatus, useEntitlements, usePermissionsAPI, useQuotas } from '@/hooks'
import { createContext, useContext, useEffect, useMemo } from 'react'
import { AuthContext } from './AuthContext'

const PermissionsContext = createContext()

export const PermissionsProvider = ({ children }) => {
  const entitlements = useEntitlements()
  const accountStatus = useAccountStatus()
  const quotas = useQuotas()
  const {
    permissions,
    features,
    roles,
    loading: permissionsLoading,  // objet de flags par section
    isLoading,                     // bool global du hook
    createRole,
    updateRole,
    deleteRole,
    updateRolePermissions,
    createFeature,
    updateFeature,
    deleteFeature,
    loadAllData,
  } = usePermissionsAPI()

  // Charger automatiquement les permissions au démarrage
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Vérifie si l'utilisateur a accès à une fonctionnalité
  const can = useMemo(() => {
    return (featureName) => {
      // Vérifier d'abord l'état du compte
      if (!accountStatus.canUseApp) {
        return false // Compte suspendu ou en suppression
      }

      if (!entitlements.role || entitlements.role === 'admin') {
        return true // Admin = accès total
      }

      // Debug logging supprimé pour réduire le spam

      const feature = features.find((f) => f.name === featureName)
      if (!feature) {
        if (import.meta.env.DEV) console.log('❌ Fonctionnalité non trouvée:', featureName)
        return false
      }

      const userRole = roles.find((r) => r.name === entitlements.role)
      if (!userRole) {
        if (import.meta.env.DEV) console.log('❌ Rôle utilisateur non trouvé:', entitlements.role)
        return false
      }

      const permission = permissions.find(
        (p) => p.feature_id === feature.id && p.role_id === userRole.id
      )

      // Debug désactivé - approche hybride implémentée

      return !!permission?.can_access
    }
  }, [entitlements.role, permissions, features, roles, accountStatus.canUseApp])

  const canAll = useMemo(() => {
    return (featureNames) => featureNames.every((f) => can(f))
  }, [can])

  const canAny = useMemo(() => {
    return (featureNames) => featureNames.some((f) => can(f))
  }, [can])

  // Debug (DEV seulement) - Log unique au chargement initial
  if (import.meta.env.DEV && !entitlements.loading && !isLoading && entitlements.userId) {
    // Log seulement une fois quand l'utilisateur est connecté et les données chargées
    const shouldLog = !window._permissionsContextLogged
    if (shouldLog) {
      console.log('🔍 PermissionsContext initialisé:', {
        role: entitlements.role,
        userId: entitlements.userId,
        permissionsCount: permissions.length,
        featuresCount: features.length,
        rolesCount: roles.length,
      })
      window._permissionsContextLogged = true
    }
  }

  // Alerte UX si non connecté une fois les chargements terminés (réduit)
  const { loading: authLoading } = useContext(AuthContext)
  if (!entitlements.loading && !authLoading && !entitlements.userId && import.meta.env.DEV) {
    console.debug('⚠️ Utilisateur non connecté - mode visitor')
  }

  // Global loading = entitlements OU chargement global du hook API
  const globalLoading = entitlements.loading || isLoading

  const value = {
    ...entitlements,
    can,
    canAll,
    canAny,
    permissions,
    features,
    roles,
    loading: globalLoading,
    // Nouveaux hooks
    accountStatus,
    quotas,
    // Actions
    createRole,
    updateRole,
    deleteRole,
    updateRolePermissions,
    createFeature,
    updateFeature,
    deleteFeature,
    loadAllData,
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export const usePermissions = () => {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions doit être utilisé dans un PermissionsProvider')
  }
  return context
}
