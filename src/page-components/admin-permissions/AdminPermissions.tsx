'use client'

// src/pages/admin-permissions/AdminPermissions.tsx
import {
  ImageAnalytics,
  InputWithValidation,
  Loader,
  ModalConfirm,
} from '@/components'
import {
  HistoryTab,
  LogsTab,
  PermissionsTab,
  RolesTab,
  UsersTab,
} from '@/components/features/admin/permissions'
import { usePermissions } from '@/contexts'
import { useAdminPermissions } from '@/hooks/useAdminPermissions'
import { createFeatureValidationRules } from '@/utils/validationRules'
import {
  BarChart3,
  History,
  Plus,
  Save,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import './AdminPermissions.scss'

type TabType =
  | 'permissions'
  | 'roles'
  | 'users'
  | 'history'
  | 'logs'
  | 'analytics'

type CategoryType = 'affichage' | 'gestion' | 'systeme' | 'securite'

interface NewRole {
  name: string
  display_name: string
  description: string
}

interface ConfirmDeleteState {
  isOpen: boolean
  roleId: string | null
  roleName: string
}

interface NewFeature {
  name: string
  display_name: string
  description: string
  category: CategoryType
}

interface ConfirmDeleteFeatureState {
  isOpen: boolean
  featureId: string | null
  featureName: string
}

// Type guards and helper types
type Role = {
  id: string
  name: string
  display_name: string
  description: string | null
  is_active: boolean
  priority: number | null
}

type Feature = {
  id: string
  name: string
  display_name: string
  description: string | null
  category: string | null
  is_active: boolean
}

type Permission = {
  role_id: string
  feature_id: string
  can_access: boolean
}

export default function AdminPermissions() {
  const router = useRouter()

  // Permissions utilisateur (pour vérifier isAdmin)
  const { loading: permissionsLoading, ready, isAdmin } = usePermissions()

  // Données et fonctions d'administration
  const {
    loading: adminLoading,
    permissions,
    features,
    roles,
    createRole,
    updateRole,
    deleteRole,
    updateRolePermissions,
    loadAllData,
    createFeature,
    updateFeature,
    deleteFeature,
  } = useAdminPermissions()

  const loading = permissionsLoading || adminLoading

  const [activeTab, setActiveTab] = useState<TabType>('permissions')

  // États locaux pour les formulaires
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [newRole, setNewRole] = useState<NewRole>({
    name: '',
    display_name: '',
    description: '',
  })
  const [editingPermissions, setEditingPermissions] = useState<string | null>(
    null
  )

  // État pour la confirmation de suppression
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({
    isOpen: false,
    roleId: null,
    roleName: '',
  })

  // État local pour les permissions temporaires (modifications en cours)
  const [tempPermissions, setTempPermissions] = useState<Permission[]>([])

  // Nouveaux états pour la création de fonctionnalités
  const [newFeature, setNewFeature] = useState<NewFeature>({
    name: '',
    display_name: '',
    description: '',
    category: 'affichage',
  })
  const [showFeatureForm, setShowFeatureForm] = useState(false)

  // État pour l'édition de fonctionnalité
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [showEditFeatureForm, setShowEditFeatureForm] = useState(false)

  // État pour la confirmation de suppression de fonctionnalité
  const [confirmDeleteFeature, setConfirmDeleteFeature] =
    useState<ConfirmDeleteFeatureState>({
      isOpen: false,
      featureId: null,
      featureName: '',
    })

  // Charger les données au montage du composant
  useEffect(() => {
    if (isAdmin) {
      loadAllData()
    }
  }, [isAdmin, loadAllData])

  // Initialiser les permissions temporaires quand les données sont chargées
  useEffect(() => {
    if (permissions && permissions.length > 0) {
      setTempPermissions([...permissions])
    }
  }, [permissions])

  // Rediriger les non-admins vers l'accueil
  useEffect(() => {
    const hasLoadedData =
      !loading &&
      ready &&
      isAdmin !== undefined &&
      permissions &&
      features &&
      roles

    if (hasLoadedData && !isAdmin) {
      router.replace('/')
    }
  }, [loading, ready, isAdmin, permissions, features, roles, router])

  // Attendre que TOUT soit chargé avant de décider
  const isLoading = loading || !ready || !permissions || !features || !roles
  const hasLoadedData =
    !loading &&
    ready &&
    isAdmin !== undefined &&
    permissions &&
    features &&
    roles

  if (isLoading) {
    return (
      <div className="admin-permissions-page">
        <div className="loading-container">
          <Loader />
          <p>Chargement de l&apos;administration...</p>
        </div>
      </div>
    )
  }

  // Rediriger les non-admins SEULEMENT après le chargement complet ET la vérification du rôle
  if (hasLoadedData && !isAdmin) {
    return (
      <div className="admin-permissions-page">
        <div className="loading-container">
          <Loader />
          <p>Redirection...</p>
        </div>
      </div>
    )
  }

  // Si les données ne sont pas encore chargées, continuer à attendre
  if (!hasLoadedData) {
    return (
      <div className="admin-permissions-page">
        <div className="loading-container">
          <Loader />
          <p>Vérification des permissions...</p>
        </div>
      </div>
    )
  }

  // Filtrer les rôles actifs pour la gestion des permissions (exclure admin qui a tous les droits)
  const manageableRoles = roles.filter(
    role => role.name !== 'admin' && role.is_active
  )

  // Gérer la création d'un nouveau rôle
  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.display_name) return

    const result = await createRole({
      ...newRole,
      priority: roles.length + 1,
    })

    if (!result.error) {
      setNewRole({ name: '', display_name: '', description: '' })
      await loadAllData()
    }
  }

  // Gérer la mise à jour d'un rôle
  const handleUpdateRole = async (roleId: string, updates: Partial<Role>) => {
    const result = await updateRole(roleId, updates)
    if (!result.error) {
      setEditingRole(null)
      await loadAllData()
    }
  }

  // Gérer la suppression d'un rôle
  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (role) {
      setConfirmDelete({
        isOpen: true,
        roleId: roleId,
        roleName: role.display_name,
      })
    }
  }

  // Gérer l'activation/désactivation d'un rôle
  const handleToggleRole = async (roleId: string, isActive: boolean) => {
    try {
      const result = await updateRole(roleId, { is_active: isActive })
      if (!result.error) {
        // Recharger les données pour s'assurer de la cohérence
        await loadAllData()
      } else {
        console.error('❌ Erreur lors de la mise à jour du rôle:', result.error)
        const errorMessage =
          result.error instanceof Error
            ? result.error.message
            : 'Erreur inconnue'
        alert(`❌ Erreur lors de la mise à jour: ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du rôle:', error)
      alert('❌ Erreur lors de la mise à jour du rôle')
    }
  }

  // Confirmer la suppression d'un rôle
  const confirmDeleteRole = async () => {
    if (confirmDelete.roleId) {
      await deleteRole(confirmDelete.roleId)
      await loadAllData()
      setConfirmDelete({ isOpen: false, roleId: null, roleName: '' })
    }
  }

  // Initialiser les permissions temporaires avec les permissions existantes
  const initializeTempPermissions = (roleId: string) => {
    const existingPermissions = permissions.filter(p => p.role_id === roleId)
    setTempPermissions(existingPermissions.map(p => ({ ...p })))
  }

  // Gérer le changement d'une permission (approche unifiée)
  const handlePermissionChange = (
    roleId: string,
    featureId: string,
    permissionType: string,
    checked: boolean
  ) => {
    // Log de debug supprimé pour réduire le spam

    // Trouver la permission existante ou en créer une nouvelle
    let permission = tempPermissions.find(
      p => p.role_id === roleId && p.feature_id === featureId
    )

    if (!permission) {
      // Créer une nouvelle permission avec seulement can_access
      permission = {
        role_id: roleId,
        feature_id: featureId,
        can_access: false,
      }
      // Ajouter à la liste des permissions temporaires
      setTempPermissions(prev => [...prev, permission!])
    }

    // Mettre à jour la permission existante
    const updatedPermission = {
      ...permission,
      [permissionType]: checked,
    }
    // Log de debug supprimé

    // Mettre à jour la liste des permissions temporaires
    setTempPermissions(prev =>
      prev.map(p =>
        p.role_id === roleId && p.feature_id === featureId
          ? updatedPermission
          : p
      )
    )

    // Log de debug supprimé
  }

  // Gérer la sauvegarde des permissions d'un rôle
  const handleSavePermissions = async (roleId: string) => {
    try {
      // Récupérer toutes les permissions pour ce rôle depuis l'état temporaire
      const rolePermissions = tempPermissions.filter(p => p.role_id === roleId)

      // Mettre à jour les permissions en base
      const result = await updateRolePermissions(roleId, rolePermissions)

      if (!result.error) {
        setEditingPermissions(null)
        // Recharger les données pour s'assurer de la cohérence
        await loadAllData()
        // Sauvegarde réussie
      } else {
        console.error('❌ Erreur lors de la sauvegarde:', result.error)
        alert('Erreur lors de la sauvegarde des permissions')
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde des permissions')
    }
  }

  // Gérer la création d'une nouvelle fonctionnalité
  const handleCreateFeature = async () => {
    if (!newFeature.name || !newFeature.display_name) return

    try {
      // Utiliser la vraie API pour créer la fonctionnalité
      const result = await createFeature({
        name: newFeature.name,
        display_name: newFeature.display_name,
        description: newFeature.description || '',
        category: newFeature.category,
        is_active: true,
      })

      if (!result.error) {
        // Réinitialiser le formulaire
        setNewFeature({
          name: '',
          display_name: '',
          description: '',
          category: 'affichage',
        })
        setShowFeatureForm(false)

        // Recharger les données
        await loadAllData()

        // Fonctionnalité créée avec succès
      } else {
        console.error('❌ Erreur lors de la création:', result.error)
        const errorMessage =
          result.error instanceof Error
            ? result.error.message
            : 'Erreur inconnue'
        alert(`❌ Erreur lors de la création: ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création:', error)
      alert('❌ Erreur lors de la création de la fonctionnalité')
    }
  }

  // Gérer la suppression d'une fonctionnalité (nouvelle approche directe)
  const handleDeleteFeature = (feature: Feature) => {
    // Gestion de la suppression de fonctionnalité

    // Ouvrir directement la modal de confirmation
    setConfirmDeleteFeature({
      isOpen: true,
      featureId: feature.id,
      featureName: feature.display_name,
    })

    // Log supprimé - debug inutile
  }

  // Gérer la modification d'une fonctionnalité
  const handleEditFeature = (feature: Feature) => {
    // Gestion de l'édition de fonctionnalité

    // Ouvrir le formulaire d'édition
    setEditingFeature(feature)
    setShowEditFeatureForm(true)
  }

  // Sauvegarder les modifications d'une fonctionnalité
  const handleSaveFeatureEdit = async () => {
    if (
      !editingFeature ||
      !editingFeature.name ||
      !editingFeature.display_name
    ) {
      alert('❌ Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      // Sauvegarde des modifications

      // Utiliser l'API pour mettre à jour la fonctionnalité
      const result = await updateFeature(editingFeature.id, {
        name: editingFeature.name,
        display_name: editingFeature.display_name,
        description: editingFeature.description,
        category: editingFeature.category,
      })

      if (!result.error) {
        // Fermer le formulaire d'édition
        setEditingFeature(null)
        setShowEditFeatureForm(false)

        // Recharger les données
        await loadAllData()

        // Fonctionnalité modifiée avec succès
      } else {
        console.error('❌ Erreur lors de la modification:', result.error)
        const errorMessage =
          result.error instanceof Error
            ? result.error.message
            : 'Erreur inconnue'
        alert(`❌ Erreur lors de la modification: ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Erreur lors de la modification:', error)
      alert('❌ Erreur lors de la modification de la fonctionnalité')
    }
  }

  // Confirmer la suppression d'une fonctionnalité
  const confirmDeleteFeatureAction = async () => {
    if (!confirmDeleteFeature.featureId) return

    try {
      // Utiliser l'API pour supprimer la fonctionnalité
      const result = await deleteFeature(confirmDeleteFeature.featureId)

      if (!result.error) {
        // Fermer la modal de confirmation
        setConfirmDeleteFeature({
          isOpen: false,
          featureId: null,
          featureName: '',
        })

        // Recharger les données (la fonctionnalité disparaîtra de la liste)
        await loadAllData()

        // Fonctionnalité supprimée avec succès
      } else {
        console.error('❌ Erreur lors de la suppression:', result.error)
        const errorMessage =
          result.error instanceof Error
            ? result.error.message
            : 'Erreur inconnue'
        alert(`❌ Erreur lors de la suppression: ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error)
      alert('❌ Erreur lors de la suppression de la fonctionnalité')
    }
  }

  return (
    <div className="admin-permissions-page">
      <div className="admin-header">
        <h1>
          <Settings className="icon" aria-hidden />
          Administration des Permissions
        </h1>
        <p>
          Gérez les rôles, permissions et utilisateurs de votre application.
          Tous les changements sont sauvegardés en base de données.
        </p>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          <Shield className="icon" aria-hidden />
          Permissions
        </button>
        <button
          className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <Users className="icon" aria-hidden />
          Rôles
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="icon" aria-hidden />
          Utilisateurs
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="icon" aria-hidden />
          Historique
        </button>
        <button
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <BarChart3 className="icon" aria-hidden />
          Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 className="icon" aria-hidden />
          Analytics Images
        </button>
      </div>

      <div className="tab-content">
        {/* Onglet Permissions */}
        {activeTab === 'permissions' && (
          <div className="permissions-tab">
            <div className="permissions-header">
              <h2>Gestion des Permissions par Rôle</h2>
              <button
                className="btn btn-primary"
                onClick={() => setShowFeatureForm(!showFeatureForm)}
              >
                <Plus size={16} />
                {showFeatureForm ? 'Masquer' : 'Ajouter une fonctionnalité'}
              </button>
            </div>

            <p>Configurez les accès aux fonctionnalités pour chaque rôle.</p>

            {/* Formulaire de création de fonctionnalité */}
            {showFeatureForm && (
              <div className="create-feature-form">
                <h3>Créer une nouvelle fonctionnalité</h3>
                <div className="form-row">
                  <InputWithValidation
                    id="new-feature-name"
                    label="Nom technique"
                    placeholder="ex: nouveau_bouton"
                    value={newFeature.name}
                    onChange={value =>
                      setNewFeature({ ...newFeature, name: value })
                    }
                    onValid={value =>
                      setNewFeature({ ...newFeature, name: value })
                    }
                    rules={
                      createFeatureValidationRules.name(
                        newFeature.name,
                        features
                      ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                    ariaLabel="Nom technique de la fonctionnalité"
                  />
                  <InputWithValidation
                    id="new-feature-display-name"
                    label="Nom d'affichage"
                    placeholder="ex: Nouveau Bouton"
                    value={newFeature.display_name}
                    onChange={value =>
                      setNewFeature({ ...newFeature, display_name: value })
                    }
                    onValid={value =>
                      setNewFeature({ ...newFeature, display_name: value })
                    }
                    rules={
                      createFeatureValidationRules.displayName(
                        newFeature.display_name
                      ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                    ariaLabel="Nom d'affichage de la fonctionnalité"
                  />
                  <InputWithValidation
                    id="new-feature-description"
                    label="Description"
                    placeholder="Description de la fonctionnalité"
                    value={newFeature.description}
                    onChange={value =>
                      setNewFeature({ ...newFeature, description: value })
                    }
                    onValid={value =>
                      setNewFeature({ ...newFeature, description: value })
                    }
                    rules={
                      createFeatureValidationRules.description(
                        newFeature.description
                      ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                    ariaLabel="Description de la fonctionnalité"
                  />
                  <select
                    value={newFeature.category}
                    onChange={e =>
                      setNewFeature({
                        ...newFeature,
                        category: e.target.value as CategoryType,
                      })
                    }
                    className="form-select"
                  >
                    <option value="affichage">Affichage</option>
                    <option value="gestion">Gestion</option>
                    <option value="systeme">Système</option>
                    <option value="securite">Sécurité</option>
                  </select>
                  <button
                    className="btn btn-success"
                    onClick={handleCreateFeature}
                    disabled={!newFeature.name || !newFeature.display_name}
                  >
                    <Plus size={16} />
                    Créer
                  </button>
                </div>
              </div>
            )}

            {/* Formulaire d'édition de fonctionnalité */}
            {showEditFeatureForm && editingFeature && (
              <div className="edit-feature-form">
                <h3>
                  Modifier la fonctionnalité &quot;{editingFeature.display_name}
                  &quot;
                </h3>
                <div className="form-row">
                  <InputWithValidation
                    id="edit-feature-name"
                    label="Nom technique"
                    placeholder="ex: nouveau_bouton"
                    value={editingFeature.name}
                    onChange={value =>
                      setEditingFeature({ ...editingFeature, name: value })
                    }
                    onValid={value =>
                      setEditingFeature({ ...editingFeature, name: value })
                    }
                    rules={
                      createFeatureValidationRules.name(
                        editingFeature.name,
                        features.filter(f => f.id !== editingFeature.id)
                      ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                    ariaLabel="Nom technique de la fonctionnalité"
                  />
                  <InputWithValidation
                    id="edit-feature-display-name"
                    label="Nom d'affichage"
                    placeholder="ex: Nouveau Bouton"
                    value={editingFeature.display_name}
                    onChange={value =>
                      setEditingFeature({
                        ...editingFeature,
                        display_name: value,
                      })
                    }
                    onValid={value =>
                      setEditingFeature({
                        ...editingFeature,
                        display_name: value,
                      })
                    }
                    rules={
                      createFeatureValidationRules.displayName(
                        editingFeature.display_name
                      ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                    ariaLabel="Nom d'affichage de la fonctionnalité"
                  />
                  <InputWithValidation
                    id="edit-feature-description"
                    label="Description"
                    placeholder="Description de la fonctionnalité"
                    value={editingFeature.description || ''}
                    onChange={value =>
                      setEditingFeature({
                        ...editingFeature,
                        description: value,
                      })
                    }
                    onValid={value =>
                      setEditingFeature({
                        ...editingFeature,
                        description: value,
                      })
                    }
                    rules={
                      createFeatureValidationRules.description(
                        editingFeature.description || ''
                      ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                    ariaLabel="Description de la fonctionnalité"
                  />
                  <select
                    value={editingFeature.category || ''}
                    onChange={e =>
                      setEditingFeature({
                        ...editingFeature,
                        category: e.target.value,
                      })
                    }
                    className="form-select"
                  >
                    <option value="affichage">Affichage</option>
                    <option value="gestion">Gestion</option>
                    <option value="systeme">Système</option>
                    <option value="securite">Sécurité</option>
                  </select>
                  <div className="form-actions">
                    <button
                      className="btn btn-success"
                      onClick={handleSaveFeatureEdit}
                      disabled={
                        !editingFeature.name || !editingFeature.display_name
                      }
                    >
                      <Save size={16} />
                      Sauvegarder
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingFeature(null)
                        setShowEditFeatureForm(false)
                      }}
                    >
                      <X size={16} />
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Composant PermissionsTab */}
            <PermissionsTab
              features={features}
              manageableRoles={manageableRoles}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              permissions={permissions as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tempPermissions={tempPermissions as any}
              editingPermissions={editingPermissions}
              setEditingPermissions={setEditingPermissions}
              handlePermissionChange={handlePermissionChange}
              handleSavePermissions={handleSavePermissions}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              handleDeleteFeature={handleDeleteFeature as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              handleEditFeature={handleEditFeature as any}
              initializeTempPermissions={initializeTempPermissions}
            />
          </div>
        )}

        {/* Onglet Rôles */}
        {activeTab === 'roles' && (
          <RolesTab
            roles={roles}
            newRole={newRole}
            setNewRole={setNewRole}
            editingRole={editingRole?.id || null}
            setEditingRole={(roleId: string | null) => {
              const role = roles.find(r => r.id === roleId) || null
              setEditingRole(role)
            }}
            handleCreateRole={handleCreateRole}
            handleUpdateRole={handleUpdateRole}
            handleDeleteRole={handleDeleteRole}
            handleToggleRole={handleToggleRole}
          />
        )}

        {/* Onglet Utilisateurs */}
        {activeTab === 'users' && <UsersTab />}

        {/* Onglet Historique */}
        {activeTab === 'history' && <HistoryTab />}

        {/* Onglet Logs */}
        {activeTab === 'logs' && <LogsTab />}

        {/* Onglet Analytics Images */}
        {activeTab === 'analytics' && <ImageAnalytics />}
      </div>

      {/* Debug info */}
      <div className="debug-info">
        <details>
          <summary>Debug: État des données</summary>
          <pre>
            {JSON.stringify(
              {
                roles: roles?.length || 0,
                features: features?.length || 0,
                permissions: permissions?.length || 0,
                manageableRoles: manageableRoles?.length || 0,
                loading: loading,
                isAdmin: isAdmin,
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>

      {/* Modal de confirmation de suppression */}
      <ModalConfirm
        isOpen={confirmDelete.isOpen}
        onClose={() =>
          setConfirmDelete({ isOpen: false, roleId: null, roleName: '' })
        }
        onConfirm={confirmDeleteRole}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
      >
        Êtes-vous sûr de vouloir supprimer le rôle{' '}
        <strong>&quot;{confirmDelete.roleName}&quot;</strong> ?
        <br />
        <small>
          Cette action est irréversible et supprimera toutes les permissions
          associées à ce rôle.
        </small>
      </ModalConfirm>

      {/* Modal de confirmation de suppression de fonctionnalité */}
      <ModalConfirm
        isOpen={confirmDeleteFeature.isOpen}
        onClose={() =>
          setConfirmDeleteFeature({
            isOpen: false,
            featureId: null,
            featureName: '',
          })
        }
        onConfirm={confirmDeleteFeatureAction}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
      >
        Êtes-vous sûr de vouloir supprimer la fonctionnalité{' '}
        <strong>&quot;{confirmDeleteFeature.featureName}&quot;</strong> ?
        <br />
        <small>
          Cette action est irréversible et supprimera toutes les permissions
          associées à cette fonctionnalité.
        </small>
      </ModalConfirm>
    </div>
  )
}
