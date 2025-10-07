// src/utils/permissions-api.js
import { supabase } from '@/utils/supabaseClient' // ⬅️ UNIFIÉ

/* -------------------- RÔLES -------------------- */
export const getRoles = async () => {
  return await supabase
    .from('roles')
    .select('*')
    .order('priority', { ascending: true })
}

export const createRole = async roleData => {
  return await supabase.from('roles').insert([roleData]).select().single()
}

export const updateRole = async (roleId, updates) => {
  return await supabase
    .from('roles')
    .update(updates)
    .eq('id', roleId)
    .select()
    .single()
}

export const deleteRole = async roleId => {
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

export const createFeature = async featureData => {
  return await supabase.from('features').insert([featureData]).select().single()
}

export const updateFeature = async (featureId, updates) => {
  return await supabase
    .from('features')
    .update(updates)
    .eq('id', featureId)
    .select()
    .single()
}

export const deleteFeature = async featureId => {
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

export const getRolePermissions = async roleId => {
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

export const updateRolePermissions = async (roleId, permissions) => {
  if (!roleId) return { error: new Error('roleId requis') }
  if (!Array.isArray(permissions))
    return { error: new Error('permissions doit être un tableau') }

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

/* ------------------ “SELF” (scopées auth.uid()) ------------------ */
export const getMyPrimaryRole = async () => {
  // => [{ role_id, role_name, priority }] | []
  return await supabase.rpc('get_my_primary_role')
}

export const getMyPermissions = async () => {
  // => [{ feature_id, feature_name, feature_display_name, category, can_access }, ...]
  return await supabase.rpc('get_my_permissions')
}

/* ------------------- UTILISATEURS & RÔLES (admin) ------------------- */
export const getUsersWithRoles = async (opts = {}) => {
  const page = Math.max(1, opts.page || 1)
  const limit = Math.max(1, Math.min(200, opts.limit || 20))
  const from = (page - 1) * limit
  const to = from + limit - 1

  let q = supabase
    .from('profiles')
    .select(
      `
      id, email, pseudo, created_at, last_login, account_status, is_online,
      user_roles (
        id, role_id,
        roles ( id, name, display_name )
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (opts.roleFilter && opts.roleFilter !== 'all') {
    if (opts.roleFilter === 'no_roles') {
      q = q.is('user_roles', null)
    } else {
      // filtre large par nom de rôle
      q = q.contains('user_roles', [{ roles: { name: opts.roleFilter } }])
    }
  }
  if (opts.statusFilter && opts.statusFilter !== 'all') {
    q = q.eq('account_status', opts.statusFilter)
  }

  const { data, error, count } = await q.range(from, to)
  const total = count || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return { data, error, pagination: { page, limit, total, totalPages } }
}

export const assignRoleToUser = async (userId, roleId) => {
  // roleId attendu = UUID
  return await supabase
    .from('user_roles')
    .insert([{ user_id: userId, role_id: roleId, is_active: true }])
}

export const removeRoleFromUser = async (userId, roleId) => {
  return await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)
}

/* ------------------ HISTORIQUE (admin) ------------------ */
export const getPermissionHistory = async (limit = 50) => {
  return await supabase
    .from('permission_changes')
    .select(
      `id, change_type, table_name, record_id, old_values, new_values, changed_by, changed_at, created_at, user_pseudo`
    )
    .order('changed_at', { ascending: false })
    .limit(limit)
}
