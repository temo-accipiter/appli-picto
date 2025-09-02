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

      // Debug logging
      console.log('🔍 Vérification permission:', {
        featureName,
        userRole: entitlements.role,
        featuresCount: features.length,
        permissionsCount: permissions.length,
        rolesCount: roles.length,
      })

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

      console.log('🔍 Permission trouvée:', {
        feature: feature.name,
        role: userRole.name,
        permission: permission ? { can_access: permission.can_access } : null,
      })

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

  // Vérifie si l'utilisateur a accès à une fonctionnalité
  const can = useMemo(() => {
    return (featureName) => {
      if (!entitlements.role || entitlements.role === 'admin') {
        return true // Admin = accès total
      }

      if (import.meta.env.DEV) {
        console.log('🔍 Vérification permission:', {
          featureName,
          userRole: entitlements.role,
          featuresCount: features.length,
          permissionsCount: permissions.length,
          rolesCount: roles.length,
        })
      }

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

      if (import.meta.env.DEV) {
        console.log('🔍 Permission trouvée:', {
          feature: feature.name,
          role: userRole.name,
          permission: permission ? { can_access: permission.can_access } : null,
        })
      }

      return !!permission?.can_access
    }
  }, [entitlements.role, permissions, features, roles])

  const canAll = useMemo(() => {
    return (featureNames) => featureNames.every((f) => can(f))
  }, [can])

  const canAny = useMemo(() => {
    return (featureNames) => featureNames.some((f) => can(f))
  }, [can])

  // Debug (DEV seulement)
  if (import.meta.env.DEV) {
    console.log('🔍 PermissionsContext Debug:', {
      entitlements: {
        role: entitlements.role,
        loading: entitlements.loading,
        userId: entitlements.userId,
      },
      permissions: {
        count: permissions.length,
        data: permissions.slice(0, 3),
      },
      features: {
        count: features.length,
        data: features.slice(0, 3),
      },
      roles: {
        count: roles.length,
        data: roles.slice(0, 3),
      },
      loading: {
        entitlements: entitlements.loading,
        // ⚠️ ici on n'accède plus à "permissionsLoading.isLoading" (n’existe pas)
        // on affiche l'objet de flags + le bool global "isLoading"
        permissionsFlags: permissionsLoading,
        apiGlobal: isLoading,
      },
    })
  }

  // Alerte UX si non connecté une fois les chargements terminés
  const { loading: authLoading } = useContext(AuthContext)
  if (!entitlements.loading && !authLoading && !entitlements.userId) {
    console.warn('⚠️ Utilisateur non connecté - userId undefined')
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
