import { isAbortLike, withAbortSafe } from '@/hooks'
import * as permissionsAPI from '@/utils/permissions-api'
import { useCallback, useEffect, useState } from 'react'
import useAuth from './useAuth'

// Log "safe" (évite les soucis d’inspection Safari)
const formatErr = e => {
  const m = String(e?.message ?? e)
  const parts = [
    m,
    e?.code ? `[${e.code}]` : '',
    e?.details ? `— ${e.details}` : '',
    e?.hint ? `(hint: ${e.hint})` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

/**
 * Hook pour gérer les permissions via l'API Supabase
 * Remplace progressivement le système basé sur les fichiers
 */
export const usePermissionsAPI = () => {
  const { user } = useAuth()

  // État pour les données
  const [roles, setRoles] = useState([])
  const [features, setFeatures] = useState([])
  const [permissions, setPermissions] = useState([])
  const [userRoles, setUserRoles] = useState([])
  const [userPermissions, setUserPermissions] = useState([])

  // État de chargement
  const [loading, setLoading] = useState({
    roles: false,
    features: false,
    permissions: false,
    userRoles: false,
    userPermissions: false,
  })

  // État des erreurs
  const [errors, setErrors] = useState({})

  // =====================================================
  // CHARGEMENT DES DONNÉES
  // =====================================================

  /**
   * Charge tous les rôles
   */
  const loadRoles = useCallback(async () => {
    // Si l'utilisateur est visitor, ne pas charger les rôles
    if (!user?.id) {
      setRoles([])
      return
    }

    setLoading(prev => ({ ...prev, roles: true }))
    setErrors(prev => ({ ...prev, roles: null }))
    try {
      // on enveloppe l'appel permissionsAPI via withAbortSafe pour neutraliser les abort/transitoires
      const { data, error, aborted } = await withAbortSafe(
        permissionsAPI.getRoles()
      )
      if (aborted || (error && isAbortLike(error))) return
      if (error) throw error
      setRoles(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(
        `❌ Erreur lors du chargement des rôles: ${formatErr(error)}`
      )
      setErrors(prev => ({ ...prev, roles: String(error?.message ?? error) }))
      // En cas d'erreur, initialiser avec un tableau vide pour éviter les blocages
      setRoles([])
    } finally {
      setLoading(prev => ({ ...prev, roles: false }))
    }
  }, [user?.id])

  /**
   * Charge toutes les fonctionnalités
   */
  const loadFeatures = useCallback(async () => {
    // Si l'utilisateur est visitor, ne pas charger les fonctionnalités
    if (!user?.id) {
      setFeatures([])
      return
    }

    setLoading(prev => ({ ...prev, features: true }))
    setErrors(prev => ({ ...prev, features: null }))
    try {
      const { data, error, aborted } = await withAbortSafe(
        permissionsAPI.getFeatures()
      )
      if (aborted || (error && isAbortLike(error))) return
      if (error) throw error
      setFeatures(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(
        `❌ Erreur lors du chargement des fonctionnalités: ${formatErr(error)}`
      )
      setErrors(prev => ({
        ...prev,
        features: String(error?.message ?? error),
      }))
      // En cas d'erreur, initialiser avec un tableau vide pour éviter les blocages
      setFeatures([])
    } finally {
      setLoading(prev => ({ ...prev, features: false }))
    }
  }, [user?.id])

  /**
   * Charge toutes les permissions
   */
  const loadPermissions = useCallback(async () => {
    // Si l'utilisateur est visitor, ne pas charger les permissions
    if (!user?.id) {
      setPermissions([])
      return
    }

    setLoading(prev => ({ ...prev, permissions: true }))
    setErrors(prev => ({ ...prev, permissions: null }))
    try {
      const { data, error, aborted } = await withAbortSafe(
        permissionsAPI.getAllPermissions()
      )
      if (aborted || (error && isAbortLike(error))) return
      if (error) throw error
      setPermissions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(
        `❌ Erreur lors du chargement des permissions: ${formatErr(error)}`
      )
      setErrors(prev => ({
        ...prev,
        permissions: String(error?.message ?? error),
      }))
      // En cas d'erreur, initialiser avec un tableau vide pour éviter les blocages
      setPermissions([])
    } finally {
      setLoading(prev => ({ ...prev, permissions: false }))
    }
  }, [user?.id])

  /**
   * Charge les rôles d'un utilisateur
   */
  const loadUserRoles = useCallback(async userId => {
    if (!userId) return
    setLoading(prev => ({ ...prev, userRoles: true }))
    setErrors(prev => ({ ...prev, userRoles: null }))
    try {
      const { data, error, aborted } = await withAbortSafe(
        permissionsAPI.getUserRoles(userId)
      )
      if (aborted || (error && isAbortLike(error))) return
      if (error) throw error
      setUserRoles(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(
        `❌ Erreur lors du chargement des rôles utilisateur: ${formatErr(error)}`
      )
      setErrors(prev => ({
        ...prev,
        userRoles: String(error?.message ?? error),
      }))
    } finally {
      setLoading(prev => ({ ...prev, userRoles: false }))
    }
  }, [])

  /**
   * Charge les permissions d'un utilisateur
   */
  const loadUserPermissions = useCallback(async userId => {
    if (!userId) return
    setLoading(prev => ({ ...prev, userPermissions: true }))
    setErrors(prev => ({ ...prev, userPermissions: null }))
    try {
      const { data, error, aborted } = await withAbortSafe(
        permissionsAPI.getUserPermissions(userId)
      )
      if (aborted || (error && isAbortLike(error))) return
      if (error) throw error
      setUserPermissions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(
        `❌ Erreur lors du chargement des permissions utilisateur: ${formatErr(error)}`
      )
      setErrors(prev => ({
        ...prev,
        userPermissions: String(error?.message ?? error),
      }))
    } finally {
      setLoading(prev => ({ ...prev, userPermissions: false }))
    }
  }, [])

  /**
   * Charge toutes les données de base
   */
  const loadAllData = useCallback(async () => {
    // Si l'utilisateur est visitor, ne pas charger les permissions sensibles
    if (!user?.id) {
      console.info('🔒 Rôle visitor : permissions ignorées')
      return
    }

    // on évite qu'un seul échec rejette tout : use Promise.allSettled
    const tasks = [loadRoles(), loadFeatures(), loadPermissions()]
    await Promise.allSettled(tasks)
  }, [loadRoles, loadFeatures, loadPermissions, user?.id])

  // =====================================================
  // GESTION DES RÔLES
  // =====================================================

  const createRole = useCallback(
    async roleData => {
      try {
        const { data, error, aborted } = await withAbortSafe(
          permissionsAPI.createRole(roleData)
        )
        if (aborted || (error && isAbortLike(error)))
          return { data: null, error: null }
        if (error) throw error
        await loadRoles()
        return { data, error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de la création du rôle: ${formatErr(error)}`
        )
        return { data: null, error }
      }
    },
    [loadRoles]
  )

  const updateRole = useCallback(
    async (roleId, updates) => {
      try {
        const { data, error, aborted } = await withAbortSafe(
          permissionsAPI.updateRole(roleId, updates)
        )
        if (aborted || (error && isAbortLike(error)))
          return { data: null, error: null }
        if (error) throw error
        await loadRoles()
        return { data, error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de la mise à jour du rôle: ${formatErr(error)}`
        )
        return { data: null, error }
      }
    },
    [loadRoles]
  )

  const deleteRole = useCallback(
    async roleId => {
      try {
        const { error, aborted } = await withAbortSafe(
          permissionsAPI.deleteRole(roleId)
        )
        if (aborted || (error && isAbortLike(error))) return { error: null }
        if (error) throw error
        await loadRoles()
        return { error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de la suppression du rôle: ${formatErr(error)}`
        )
        return { error }
      }
    },
    [loadRoles]
  )

  // =====================================================
  // GESTION DES PERMISSIONS
  // =====================================================

  const updateRolePermissions = useCallback(
    async (roleId, permissions) => {
      try {
        const { error, aborted } = await withAbortSafe(
          permissionsAPI.updateRolePermissions(roleId, permissions)
        )
        if (aborted || (error && isAbortLike(error))) return { error: null }
        if (error) throw error
        await loadPermissions()
        return { error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de la mise à jour des permissions: ${formatErr(error)}`
        )
        return { error }
      }
    },
    [loadPermissions]
  )

  // =====================================================
  // GESTION DES FONCTIONNALITÉS
  // =====================================================

  const createFeature = useCallback(
    async featureData => {
      try {
        const { data, error, aborted } = await withAbortSafe(
          permissionsAPI.createFeature(featureData)
        )
        if (aborted || (error && isAbortLike(error)))
          return { data: null, error: null }
        if (error) throw error
        await loadFeatures()
        return { data, error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de la création de la fonctionnalité: ${formatErr(error)}`
        )
        return { data: null, error }
      }
    },
    [loadFeatures]
  )

  const deleteFeature = useCallback(
    async featureId => {
      try {
        const { error, aborted } = await withAbortSafe(
          permissionsAPI.deleteFeature(featureId)
        )
        if (aborted || (error && isAbortLike(error))) return { error: null }
        if (error) throw error
        await loadFeatures()
        return { error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de la suppression de la fonctionnalité: ${formatErr(error)}`
        )
        return { error }
      }
    },
    [loadFeatures]
  )

  const updateFeature = useCallback(
    async (featureId, updates) => {
      try {
        const { data, error, aborted } = await withAbortSafe(
          permissionsAPI.updateFeature(featureId, updates)
        )
        if (aborted || (error && isAbortLike(error)))
          return { data: null, error: null }
        if (error) throw error
        await loadFeatures()
        return { data, error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de la modification de la fonctionnalité: ${formatErr(error)}`
        )
        return { data: null, error }
      }
    },
    [loadFeatures]
  )

  // =====================================================
  // GESTION DES UTILISATEURS
  // =====================================================

  const assignUserRole = useCallback(
    async (userId, roleId) => {
      try {
        const { data, error, aborted } = await withAbortSafe(
          permissionsAPI.assignRoleToUser(userId, roleId)
        )
        if (aborted || (error && isAbortLike(error)))
          return { data: null, error: null }
        if (error) throw error
        await loadUserRoles(userId)
        return { data, error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de l'assignation du rôle: ${formatErr(error)}`
        )
        return { data: null, error }
      }
    },
    [loadUserRoles]
  )

  const removeUserRole = useCallback(
    async (userId, roleId) => {
      try {
        const { error, aborted } = await withAbortSafe(
          permissionsAPI.removeRoleFromUser(userId, roleId)
        )
        if (aborted || (error && isAbortLike(error))) return { error: null }
        if (error) throw error
        await loadUserRoles(userId)
        return { error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de la suppression du rôle utilisateur: ${formatErr(error)}`
        )
        return { error }
      }
    },
    [loadUserRoles]
  )

  // =====================================================
  // VÉRIFICATION DES PERMISSIONS
  // =====================================================

  const checkPermission = useCallback(
    async (userId, featureName, _permissionType = 'access') => {
      try {
        // Vérification simplifiée via les permissions utilisateur
        const { data: userPerms, error: permError } =
          await permissionsAPI.getUserPermissions(userId)
        if (permError) throw permError

        const hasPermission = userPerms?.some(
          perm => perm.feature_name === featureName && perm.can_access === true
        )
        return { data: hasPermission || false, error: null }
      } catch (error) {
        console.error(
          `❌ Erreur lors de la vérification de permission: ${formatErr(error)}`
        )
        return { data: false, error }
      }
    },
    []
  )

  // =====================================================
  // UTILITAIRES
  // =====================================================

  const getRoleByName = useCallback(
    roleName => roles.find(role => role.name === roleName),
    [roles]
  )

  const getFeatureByName = useCallback(
    featureName => features.find(feature => feature.name === featureName),
    [features]
  )

  const getRolePermissions = useCallback(
    roleId => permissions.filter(permission => permission.role_id === roleId),
    [permissions]
  )

  const getUserPermissions = useCallback(
    userId =>
      userPermissions.filter(permission => permission.user_id === userId),
    [userPermissions]
  )

  // =====================================================
  // EFFETS
  // =====================================================

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  useEffect(() => {
    if (user?.id) {
      loadUserRoles(user.id)
      loadUserPermissions(user.id)
    } else {
      setUserRoles([])
      setUserPermissions([])
    }
  }, [user?.id, loadUserRoles, loadUserPermissions])

  // =====================================================
  // RETOUR
  // =====================================================

  return {
    // Données
    roles,
    features,
    permissions,
    userRoles,
    userPermissions,

    // État de chargement
    loading,

    // Erreurs
    errors,

    // Actions
    loadRoles,
    loadFeatures,
    loadPermissions,
    loadUserRoles,
    loadUserPermissions,
    loadAllData,

    // Gestion des rôles
    createRole,
    updateRole,
    deleteRole,

    // Gestion des permissions
    updateRolePermissions,

    // Gestion des fonctionnalités
    createFeature,
    updateFeature,
    deleteFeature,

    // Gestion des utilisateurs
    assignUserRole,
    removeUserRole,

    // Vérification des permissions
    checkPermission,

    // Utilitaires
    getRoleByName,
    getFeatureByName,
    getRolePermissions,
    getUserPermissions,

    // État global
    isLoading: Object.values(loading).some(Boolean),
    hasErrors: Object.keys(errors).length > 0,
  }
}
