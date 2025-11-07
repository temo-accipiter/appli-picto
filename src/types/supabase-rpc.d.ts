// src/types/supabase-rpc.d.ts
// Types pour les fonctions RPC Supabase utilisées dans l'app

import type { QuotaData, UsageData } from './global'

/**
 * RPC: get_usage_fast
 * Récupère quotas + usage en un seul appel (optimisé pour FREE accounts)
 */
export interface GetUsageFastResponse {
  quotas: QuotaData[]
  usage: UsageData
}

/**
 * RPC: get_my_primary_role
 * Retourne le rôle principal de l'utilisateur connecté
 */
export interface GetMyPrimaryRoleResponse {
  role_name?: string
  role?: string
  rolename?: string
  name?: string
}

/**
 * RPC: get_my_permissions
 * Retourne toutes les permissions de l'utilisateur connecté
 */
export interface GetMyPermissionsResponse {
  feature_name?: string
  name?: string
  feature?: string
  code?: string
  can_access?: boolean
  allowed?: boolean
  enabled?: boolean
}

/**
 * RPC: select_recompense_atomic
 * Sélection unique d'une récompense (atomique, évite race conditions)
 */
export interface SelectRecompenseAtomicParams {
  p_reward_id: string
}
