// src/hooks/useAdminPermissions.js
// Hook pour la gestion administrative des permissions, rôles et fonctionnalités
// À utiliser uniquement dans les composants admin

import { useCallback, useState } from 'react'
import {
  createFeature,
  createRole,
  deleteFeature,
  deleteRole,
  getAllPermissions,
  getFeatures,
  getRoles,
  updateFeature,
  updateRole,
  updateRolePermissions,
} from '@/utils/permissions-api'

/**
 * Hook personnalisé pour gérer l'administration des permissions
 * @returns {Object} Fonctions et états pour gérer roles, features et permissions
 */
export function useAdminPermissions() {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState([])
  const [features, setFeatures] = useState([])
  const [permissions, setPermissions] = useState([])
  const [error, setError] = useState(null)

  /**
   * Charge toutes les données: rôles, fonctionnalités et permissions
   */
  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [rolesRes, featuresRes, permissionsRes] = await Promise.all([
        getRoles(),
        getFeatures(),
        getAllPermissions(),
      ])

      if (rolesRes.error) throw rolesRes.error
      if (featuresRes.error) throw featuresRes.error
      if (permissionsRes.error) throw permissionsRes.error

      setRoles(rolesRes.data || [])
      setFeatures(featuresRes.data || [])
      setPermissions(permissionsRes.data || [])
    } catch (err) {
      console.error('❌ Erreur lors du chargement des données admin:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Crée un nouveau rôle
   */
  const handleCreateRole = useCallback(async roleData => {
    try {
      const result = await createRole(roleData)
      if (result.error) throw result.error
      return result
    } catch (err) {
      console.error('❌ Erreur lors de la création du rôle:', err)
      return { error: err }
    }
  }, [])

  /**
   * Met à jour un rôle existant
   */
  const handleUpdateRole = useCallback(async (roleId, updates) => {
    try {
      const result = await updateRole(roleId, updates)
      if (result.error) throw result.error
      return result
    } catch (err) {
      console.error('❌ Erreur lors de la mise à jour du rôle:', err)
      return { error: err }
    }
  }, [])

  /**
   * Supprime un rôle
   */
  const handleDeleteRole = useCallback(async roleId => {
    try {
      const result = await deleteRole(roleId)
      if (result.error) throw result.error
      return result
    } catch (err) {
      console.error('❌ Erreur lors de la suppression du rôle:', err)
      return { error: err }
    }
  }, [])

  /**
   * Crée une nouvelle fonctionnalité
   */
  const handleCreateFeature = useCallback(async featureData => {
    try {
      const result = await createFeature(featureData)
      if (result.error) throw result.error
      return result
    } catch (err) {
      console.error('❌ Erreur lors de la création de la fonctionnalité:', err)
      return { error: err }
    }
  }, [])

  /**
   * Met à jour une fonctionnalité existante
   */
  const handleUpdateFeature = useCallback(async (featureId, updates) => {
    try {
      const result = await updateFeature(featureId, updates)
      if (result.error) throw result.error
      return result
    } catch (err) {
      console.error(
        '❌ Erreur lors de la mise à jour de la fonctionnalité:',
        err
      )
      return { error: err }
    }
  }, [])

  /**
   * Supprime une fonctionnalité
   */
  const handleDeleteFeature = useCallback(async featureId => {
    try {
      const result = await deleteFeature(featureId)
      if (result.error) throw result.error
      return result
    } catch (err) {
      console.error(
        '❌ Erreur lors de la suppression de la fonctionnalité:',
        err
      )
      return { error: err }
    }
  }, [])

  /**
   * Met à jour les permissions d'un rôle
   */
  const handleUpdateRolePermissions = useCallback(
    async (roleId, permissionsData) => {
      try {
        const result = await updateRolePermissions(roleId, permissionsData)
        if (result.error) throw result.error
        return result
      } catch (err) {
        console.error('❌ Erreur lors de la mise à jour des permissions:', err)
        return { error: err }
      }
    },
    []
  )

  return {
    loading,
    roles,
    features,
    permissions,
    error,
    loadAllData,
    createRole: handleCreateRole,
    updateRole: handleUpdateRole,
    deleteRole: handleDeleteRole,
    createFeature: handleCreateFeature,
    updateFeature: handleUpdateFeature,
    deleteFeature: handleDeleteFeature,
    updateRolePermissions: handleUpdateRolePermissions,
  }
}

export default useAdminPermissions
