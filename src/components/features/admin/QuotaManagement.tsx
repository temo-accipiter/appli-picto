// src/components/admin/QuotaManagement.tsx
import { usePermissions } from '@/contexts'
import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import './QuotaManagement.scss'

interface Role {
  id: string
  name: string
  display_name: string
  priority: number | null
}

interface Quota {
  id: string
  role_id: string
  quota_type: string
  quota_limit: number
  quota_period: string | null
  roles: {
    name: string
    display_name: string
  }
}

interface QuotaFormData {
  quota_type: string
  quota_limit: string
  quota_period: string
}

interface QuotasByRole {
  [roleName: string]: Quota[]
}

interface QuotaManagementProps {
  className?: string
}

/**
 * Composant de gestion des quotas pour les administrateurs
 * Permet de visualiser et modifier les quotas des rôles
 */
export default function QuotaManagement({
  className = '',
}: QuotaManagementProps) {
  const { can } = usePermissions()

  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])
  const [quotas, setQuotas] = useState<Quota[]>([])
  const [editingQuota, setEditingQuota] = useState<Quota | null>(null)
  const [formData, setFormData] = useState<QuotaFormData>({
    quota_type: '',
    quota_limit: '',
    quota_period: 'monthly',
  })

  // Charger les rôles et quotas
  useEffect(() => {
    if (!can('quota_management')) return
    const fetchData = async () => {
      setLoading(true)
      try {
        // Récupérer les rôles
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('*')
          .order('priority', { ascending: false })

        if (rolesError) throw rolesError

        // Récupérer les quotas
        const { data: quotasData, error: quotasError } = await supabase
          .from('role_quotas')
          .select(
            `
            *,
            roles!inner(name, display_name)
          `
          )
          .order('role_id, quota_type')

        if (quotasError) throw quotasError

        setRoles(rolesData || [])
        setQuotas(quotasData || [])
      } catch (error) {
        console.error('Erreur chargement quotas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [can])

  // Grouper les quotas par rôle
  const quotasByRole: QuotasByRole = quotas.reduce((acc, quota) => {
    const roleName = quota.roles.name
    if (!acc[roleName]) {
      acc[roleName] = []
    }
    acc[roleName].push(quota)
    return acc
  }, {} as QuotasByRole)

  // Gérer l'édition d'un quota
  const handleEditQuota = (quota: Quota) => {
    setEditingQuota(quota)
    setFormData({
      quota_type: quota.quota_type,
      quota_limit: quota.quota_limit.toString(),
      quota_period: quota.quota_period || 'monthly',
    })
  }

  // Sauvegarder les modifications
  const handleSaveQuota = async () => {
    if (!editingQuota) return

    try {
      const { error } = await supabase
        .from('role_quotas')
        .update({
          quota_limit: parseInt(formData.quota_limit),
          quota_period: formData.quota_period,
        })
        .eq('id', editingQuota.id)

      if (error) throw error

      // Rafraîchir les données
      const { data: quotasData, error: quotasError } = await supabase
        .from('role_quotas')
        .select(
          `
          *,
          roles!inner(name, display_name)
        `
        )
        .order('role_id, quota_type')

      if (quotasError) throw quotasError

      setQuotas(quotasData || [])
      setEditingQuota(null)
    } catch (error) {
      console.error('Erreur sauvegarde quota:', error)
    }
  }

  // Annuler l'édition
  const handleCancelEdit = () => {
    setEditingQuota(null)
    setFormData({
      quota_type: '',
      quota_limit: '',
      quota_period: 'monthly',
    })
  }

  // Créer un nouveau quota
  const handleCreateQuota = async () => {
    if (!formData.quota_type || !formData.quota_limit || !editingQuota) return

    try {
      const { error } = await supabase.from('role_quotas').insert([
        {
          role_id: editingQuota.role_id,
          quota_type: formData.quota_type,
          quota_limit: parseInt(formData.quota_limit),
          quota_period: formData.quota_period,
        },
      ])

      if (error) throw error

      // Rafraîchir les données
      const { data: quotasData, error: quotasError } = await supabase
        .from('role_quotas')
        .select(
          `
          *,
          roles!inner(name, display_name)
        `
        )
        .order('role_id, quota_type')

      if (quotasError) throw quotasError

      setQuotas(quotasData || [])
      setEditingQuota(null)
    } catch (error) {
      console.error('Erreur création quota:', error)
    }
  }

  if (loading) {
    return (
      <div className={`quota-management loading ${className}`}>
        <div className="loading-spinner">⏳</div>
        <p>Chargement des quotas...</p>
      </div>
    )
  }

  // Vérifier les permissions
  if (!can('quota_management')) {
    return (
      <div className={`quota-management no-permission ${className}`}>
        <p>Vous n&apos;avez pas les permissions pour gérer les quotas.</p>
      </div>
    )
  }

  return (
    <div className={`quota-management ${className}`}>
      <div className="quota-header">
        <h2>Gestion des Quotas</h2>
        <p>Configurez les limites pour chaque rôle d&apos;utilisateur</p>
      </div>

      <div className="quota-content">
        {roles.map(role => (
          <div key={role.id} className="role-section">
            <h3 className="role-title">
              {role.display_name}
              <span className="role-name">({role.name})</span>
            </h3>

            <div className="quotas-list">
              {quotasByRole[role.name]?.map(quota => (
                <div key={quota.id} className="quota-item">
                  <div className="quota-info">
                    <span className="quota-type">{quota.quota_type}</span>
                    <span className="quota-limit">{quota.quota_limit}</span>
                    <span className="quota-period">({quota.quota_period})</span>
                  </div>
                  <button
                    className="edit-button"
                    onClick={() => handleEditQuota(quota)}
                  >
                    Modifier
                  </button>
                </div>
              )) || <p className="no-quotas">Aucun quota défini</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Modal d'édition */}
      {editingQuota && (
        <div className="quota-modal">
          <div className="modal-content">
            <h3>Modifier le quota</h3>

            <div className="form-group">
              <label>Type de quota</label>
              <select
                value={formData.quota_type}
                onChange={e =>
                  setFormData({ ...formData, quota_type: e.target.value })
                }
              >
                <option value="max_tasks">Tâches max (total)</option>
                <option value="max_rewards">Récompenses max (total)</option>
                <option value="monthly_tasks">Tâches mensuelles</option>
                <option value="monthly_rewards">Récompenses mensuelles</option>
              </select>
            </div>

            <div className="form-group">
              <label>Limite</label>
              <input
                type="number"
                value={formData.quota_limit}
                onChange={e =>
                  setFormData({ ...formData, quota_limit: e.target.value })
                }
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Période</label>
              <select
                value={formData.quota_period}
                onChange={e =>
                  setFormData({ ...formData, quota_period: e.target.value })
                }
              >
                <option value="monthly">Mensuel</option>
                <option value="total">Total</option>
                <option value="daily">Quotidien</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="save-button" onClick={handleSaveQuota}>
                Sauvegarder
              </button>
              <button className="cancel-button" onClick={handleCancelEdit}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
