/**
 * Types pour système de plans & quotas (Phase 0 - Refonte Rôles)
 */

export type RoleName = 'free' | 'abonne' | 'staff' | 'admin'

export interface AccountPlan {
  id: string
  name: RoleName
  display_name: string
  max_tasks: number
  max_rewards: number
  max_categories: number
  max_custom_cards: number
  can_access_settings: boolean
  can_access_profil: boolean
  can_access_admin: boolean
  can_manage_users: boolean
  can_view_metrics: boolean
  can_manage_plans: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export interface UserPlanInfo {
  plan_name: RoleName
  display_name: string
  max_tasks: number
  max_rewards: number
  max_categories: number
  max_custom_cards: number
  can_access_settings: boolean
  can_access_profil: boolean
  can_access_admin: boolean
  can_manage_users: boolean
  can_view_metrics: boolean
  can_manage_plans: boolean
}

export interface UserQuotasWithUsage {
  plan_name: RoleName
  max_tasks: number
  max_rewards: number
  max_categories: number
  tasks_used: number
  rewards_used: number
  categories_used: number
  can_create_task: boolean
  can_create_reward: boolean
  can_create_category: boolean
}

export interface QuotaInfo {
  type: 'task' | 'reward' | 'category' | 'custom_card'
  limit: number
  current: number
  remaining: number
  percentage: number
  canCreate: boolean
}

/**
 * Permissions dérivées du plan
 */
export interface PlanPermissions {
  // Accès features
  canAccessSettings: boolean
  canAccessProfil: boolean
  canAccessAdmin: boolean

  // Permissions admin
  canManageUsers: boolean
  canViewMetrics: boolean
  canManagePlans: boolean

  // Permissions créations
  canCreateTask: boolean
  canCreateReward: boolean
  canCreateCategory: boolean
  canCreateCustomCard: boolean
}
