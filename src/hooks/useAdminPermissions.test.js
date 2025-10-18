// src/hooks/useAdminPermissions.test.js
/**
 * Tests pour le hook useAdminPermissions
 *
 * Vérifie :
 * - Chargement des données (roles, features, permissions)
 * - Création de rôle
 * - Mise à jour de rôle
 * - Suppression de rôle
 * - Création de fonctionnalité
 * - Mise à jour de fonctionnalité
 * - Suppression de fonctionnalité
 * - Mise à jour des permissions d'un rôle
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

// ✅ Utiliser vi.hoisted() pour les mocks (hoisting Vitest)
const {
  mockGetRoles,
  mockGetFeatures,
  mockGetAllPermissions,
  mockCreateRole,
  mockUpdateRole,
  mockDeleteRole,
  mockCreateFeature,
  mockUpdateFeature,
  mockDeleteFeature,
  mockUpdateRolePermissions,
} = vi.hoisted(() => ({
  mockGetRoles: vi.fn(),
  mockGetFeatures: vi.fn(),
  mockGetAllPermissions: vi.fn(),
  mockCreateRole: vi.fn(),
  mockUpdateRole: vi.fn(),
  mockDeleteRole: vi.fn(),
  mockCreateFeature: vi.fn(),
  mockUpdateFeature: vi.fn(),
  mockDeleteFeature: vi.fn(),
  mockUpdateRolePermissions: vi.fn(),
}))

vi.mock('@/utils/permissions-api', () => ({
  getRoles: mockGetRoles,
  getFeatures: mockGetFeatures,
  getAllPermissions: mockGetAllPermissions,
  createRole: mockCreateRole,
  updateRole: mockUpdateRole,
  deleteRole: mockDeleteRole,
  createFeature: mockCreateFeature,
  updateFeature: mockUpdateFeature,
  deleteFeature: mockDeleteFeature,
  updateRolePermissions: mockUpdateRolePermissions,
}))

describe('useAdminPermissions', () => {
  // Import dynamique du hook (après les mocks)
  let useAdminPermissions
  beforeAll(async () => {
    useAdminPermissions = (await import('./useAdminPermissions')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadAllData', () => {
    it('doit charger roles, features et permissions', async () => {
      // Arrange
      const mockRoles = [
        { id: '1', name: 'Admin', slug: 'admin' },
        { id: '2', name: 'User', slug: 'user' },
      ]
      const mockFeatures = [
        { id: '1', name: 'Tasks', slug: 'tasks' },
        { id: '2', name: 'Rewards', slug: 'rewards' },
      ]
      const mockPermissions = [
        { id: '1', role_id: '1', feature_id: '1', can_read: true },
        { id: '2', role_id: '2', feature_id: '2', can_write: true },
      ]

      mockGetRoles.mockResolvedValue({ data: mockRoles, error: null })
      mockGetFeatures.mockResolvedValue({ data: mockFeatures, error: null })
      mockGetAllPermissions.mockResolvedValue({
        data: mockPermissions,
        error: null,
      })

      // Act
      const { result } = renderHook(() => useAdminPermissions())

      await act(async () => {
        await result.current.loadAllData()
      })

      // Assert
      await waitFor(() => {
        expect(result.current.roles).toEqual(mockRoles)
        expect(result.current.features).toEqual(mockFeatures)
        expect(result.current.permissions).toEqual(mockPermissions)
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe(null)
      })
    })

    it('doit gérer les erreurs de chargement', async () => {
      // Arrange
      const mockError = new Error('Network error')
      mockGetRoles.mockResolvedValue({ data: null, error: mockError })
      mockGetFeatures.mockResolvedValue({ data: [], error: null })
      mockGetAllPermissions.mockResolvedValue({ data: [], error: null })

      // Act
      const { result } = renderHook(() => useAdminPermissions())

      await act(async () => {
        await result.current.loadAllData()
      })

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(mockError)
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('createRole', () => {
    it('doit créer un nouveau rôle', async () => {
      // Arrange
      const roleData = { name: 'Editor', slug: 'editor' }
      const mockResult = { data: { id: '3', ...roleData }, error: null }
      mockCreateRole.mockResolvedValue(mockResult)

      // Act
      const { result } = renderHook(() => useAdminPermissions())
      let response

      await act(async () => {
        response = await result.current.createRole(roleData)
      })

      // Assert
      expect(response).toEqual(mockResult)
      expect(mockCreateRole).toHaveBeenCalledWith(roleData)
    })

    it('doit gérer les erreurs de création de rôle', async () => {
      // Arrange
      const roleData = { name: 'Duplicate', slug: 'duplicate' }
      const mockError = new Error('Role already exists')
      mockCreateRole.mockResolvedValue({ data: null, error: mockError })

      // Act
      const { result } = renderHook(() => useAdminPermissions())
      let response

      await act(async () => {
        response = await result.current.createRole(roleData)
      })

      // Assert
      expect(response.error).toBe(mockError)
    })
  })

  describe('updateRole', () => {
    it('doit mettre à jour un rôle', async () => {
      // Arrange
      const roleId = '1'
      const updates = { name: 'Super Admin' }
      const mockResult = {
        data: { id: roleId, name: 'Super Admin', slug: 'admin' },
        error: null,
      }
      mockUpdateRole.mockResolvedValue(mockResult)

      // Act
      const { result } = renderHook(() => useAdminPermissions())
      let response

      await act(async () => {
        response = await result.current.updateRole(roleId, updates)
      })

      // Assert
      expect(response).toEqual(mockResult)
      expect(mockUpdateRole).toHaveBeenCalledWith(roleId, updates)
    })
  })

  describe('deleteRole', () => {
    it('doit supprimer un rôle', async () => {
      // Arrange
      const roleId = '2'
      const mockResult = { data: { id: roleId }, error: null }
      mockDeleteRole.mockResolvedValue(mockResult)

      // Act
      const { result } = renderHook(() => useAdminPermissions())
      let response

      await act(async () => {
        response = await result.current.deleteRole(roleId)
      })

      // Assert
      expect(response).toEqual(mockResult)
      expect(mockDeleteRole).toHaveBeenCalledWith(roleId)
    })
  })

  describe('createFeature', () => {
    it('doit créer une nouvelle fonctionnalité', async () => {
      // Arrange
      const featureData = { name: 'Categories', slug: 'categories' }
      const mockResult = { data: { id: '3', ...featureData }, error: null }
      mockCreateFeature.mockResolvedValue(mockResult)

      // Act
      const { result } = renderHook(() => useAdminPermissions())
      let response

      await act(async () => {
        response = await result.current.createFeature(featureData)
      })

      // Assert
      expect(response).toEqual(mockResult)
      expect(mockCreateFeature).toHaveBeenCalledWith(featureData)
    })
  })

  describe('updateFeature', () => {
    it('doit mettre à jour une fonctionnalité', async () => {
      // Arrange
      const featureId = '1'
      const updates = { name: 'Tasks Management' }
      const mockResult = {
        data: { id: featureId, name: 'Tasks Management', slug: 'tasks' },
        error: null,
      }
      mockUpdateFeature.mockResolvedValue(mockResult)

      // Act
      const { result } = renderHook(() => useAdminPermissions())
      let response

      await act(async () => {
        response = await result.current.updateFeature(featureId, updates)
      })

      // Assert
      expect(response).toEqual(mockResult)
      expect(mockUpdateFeature).toHaveBeenCalledWith(featureId, updates)
    })
  })

  describe('deleteFeature', () => {
    it('doit supprimer une fonctionnalité', async () => {
      // Arrange
      const featureId = '2'
      const mockResult = { data: { id: featureId }, error: null }
      mockDeleteFeature.mockResolvedValue(mockResult)

      // Act
      const { result } = renderHook(() => useAdminPermissions())
      let response

      await act(async () => {
        response = await result.current.deleteFeature(featureId)
      })

      // Assert
      expect(response).toEqual(mockResult)
      expect(mockDeleteFeature).toHaveBeenCalledWith(featureId)
    })
  })

  describe('updateRolePermissions', () => {
    it("doit mettre à jour les permissions d'un rôle", async () => {
      // Arrange
      const roleId = '1'
      const permissionsData = [
        { feature_id: '1', can_read: true, can_write: true },
        { feature_id: '2', can_read: true, can_write: false },
      ]
      const mockResult = { data: permissionsData, error: null }
      mockUpdateRolePermissions.mockResolvedValue(mockResult)

      // Act
      const { result } = renderHook(() => useAdminPermissions())
      let response

      await act(async () => {
        response = await result.current.updateRolePermissions(
          roleId,
          permissionsData
        )
      })

      // Assert
      expect(response).toEqual(mockResult)
      expect(mockUpdateRolePermissions).toHaveBeenCalledWith(
        roleId,
        permissionsData
      )
    })

    it('doit gérer les erreurs de mise à jour des permissions', async () => {
      // Arrange
      const roleId = '1'
      const permissionsData = [{ feature_id: '1', can_read: true }]
      const mockError = new Error('Permission update failed')
      mockUpdateRolePermissions.mockResolvedValue({
        data: null,
        error: mockError,
      })

      // Act
      const { result } = renderHook(() => useAdminPermissions())
      let response

      await act(async () => {
        response = await result.current.updateRolePermissions(
          roleId,
          permissionsData
        )
      })

      // Assert
      expect(response.error).toBe(mockError)
    })
  })
})
