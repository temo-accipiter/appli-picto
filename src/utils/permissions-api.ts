// src/utils/permissions-api.ts
import { supabase } from '@/utils/supabaseClient' // ⬅️ UNIFIÉ
import type { PostgrestSingleResponse } from '@supabase/supabase-js'

/* -------------------- RÔLES -------------------- */
export const getRoles = async () => {
  return await supabase
    .from('roles')
    .select('*')
    .order('priority', { ascending: true })
}

export const createRole = async (roleData: Record<string, any>) => {
  return await supabase.from('roles').insert([roleData]).select().single()
}

export const updateRole = async (
  roleId: string,
  updates: Record<string, any>
) => {
  return await supabase
    .from('roles')
    .update(updates)
    .eq('id', roleId)
    .select()
    .single()
}

export const deleteRole = async (roleId: string) => {
  return await supabase.from('roles').delete().eq('id', roleId)
}

/* -------------------- FEATURES -------------------- */
export const getFeatures = async () => {
  return await supabase
    .from('features')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })
}

export const createFeature = async (featureData: Record<string, any>) => {
  return await supabase.from('features').insert([featureData]).select().single()
}

export const updateFeature = async (
  featureId: string,
  updates: Record<string, any>
) => {
  return await supabase
    .from('features')
    .update(updates)
    .eq('id', featureId)
    .select()
    .single()
}

export const deleteFeature = async (featureId: string) => {
  // Nettoyer les permissions liées avant de supprimer la feature
  const delPerms = await supabase
    .from('role_permissions')
    .delete()
    .eq('feature_id', featureId)
  if (delPerms.error) return delPerms
  return await supabase.from('features').delete().eq('id', featureId)
}

/* ------------- PERMISSIONS PAR RÔLE (admin) ------------- */
export const getAllPermissions = async () => {
  return await supabase.from('role_permissions').select(`
      id, role_id, feature_id, can_access,
      roles ( id, name, display_name, priority ),
      features ( id, name, display_name, category, description )
    `)
}

export const getRolePermissions = async (roleId: string) => {
  return await supabase
    .from('role_permissions')
    .select(
      `
      id, role_id, feature_id, can_access,
      features ( id, name, display_name, category, description )
    `
    )
    .eq('role_id', roleId)
}

interface PermissionData {
  feature_id: string
  can_access: boolean
}

export const updateRolePermissions = async (
  roleId: string,
  permissions: PermissionData[]
) => {
  if (!roleId) return { error: new Error('roleId requis'), data: null }
  if (!Array.isArray(permissions))
    return { error: new Error('permissions doit être un tableau'), data: null }

  // stratégie remplace-tout
  const del = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
  if (del.error) return del

  if (permissions.length === 0) return { data: [], error: null }

  const payload = permissions.map(p => ({
    role_id: roleId,
    feature_id: p.feature_id,
    can_access: !!p.can_access,
  }))
  return await supabase.from('role_permissions').insert(payload).select()
}

/* ------------------ "SELF" (scopées auth.uid()) ------------------ */
export const getMyPrimaryRole = async () => {
  // => [{ role_id, role_name, priority }] | []
  return await supabase.rpc('get_my_primary_role')
}

export const getMyPermissions = async () => {
  // => [{ feature_id, feature_name, feature_display_name, category, can_access }, ...]
  return await supabase.rpc('get_my_permissions')
}

/* ------------------- UTILISATEURS & RÔLES (admin) ------------------- */
interface GetUsersOptions {
  page?: number
  limit?: number
  roleFilter?: string
  statusFilter?: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface GetUsersResult {
  data: any[] | null
  error: any
  pagination: PaginationInfo
}

export const getUsersWithRoles = async (
  opts: GetUsersOptions = {}
): Promise<GetUsersResult> => {
  const page = Math.max(1, opts.page || 1)
  const limit = Math.max(1, Math.min(200, opts.limit || 20))
  const roleFilter = opts.roleFilter || 'all'
  const statusFilter = opts.statusFilter || 'all'

  // Utiliser la fonction RPC pour éviter les problèmes de FK entre profiles et user_roles
  const { data, error } = await supabase.rpc('get_users_with_roles', {
    page_num: page,
    page_limit: limit,
    role_filter: roleFilter,
    status_filter: statusFilter,
  })

  if (error) {
    return {
      data: null,
      error,
      pagination: { page, limit, total: 0, totalPages: 1 },
    }
  }

  // Extraire le total_count de la première ligne (toutes les lignes ont le même total)
  const total = data && data.length > 0 ? data[0].total_count : 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return { data, error: null, pagination: { page, limit, total, totalPages } }
}

export const assignRoleToUser = async (userId: string, roleId: string) => {
  // roleId attendu = UUID
  return await supabase
    .from('user_roles')
    .insert([{ user_id: userId, role_id: roleId, is_active: true }])
}

export const removeRoleFromUser = async (userId: string, roleId: string) => {
  return await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)
}

/* ------------------ HISTORIQUE (admin) ------------------ */
export const getPermissionHistory = async (limit: number = 50) => {
  return await supabase
    .from('permission_changes')
    .select(
      `id, change_type, table_name, record_id, old_values, new_values, changed_by, changed_at, created_at, change_reason`
    )
    .order('changed_at', { ascending: false })
    .limit(limit)
}
