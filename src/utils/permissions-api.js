/*
import { supabase } from './supabaseClient'

/**
 * API pour la gestion des permissions
 * Permet de gérer les rôles, fonctionnalités et permissions
 */

// =====================================================
// GESTION DES RÔLES
// =====================================================

/**
 * Récupère tous les rôles disponibles
 *
export const getRoles = async () => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('priority', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles:', error)
    return { data: null, error }
  }
}

/**
 * Crée un nouveau rôle
 *
export const createRole = async roleData => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .insert([roleData])
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erreur lors de la création du rôle:', error)
    return { data: null, error }
  }
}

/**
 * Met à jour un rôle existant
 *
export const updateRole = async (roleId, updates) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error)
    return { data: null, error }
  }
}

/**
 * Supprime un rôle
 *
export const deleteRole = async roleId => {
  try {
    const { error } = await supabase.from('roles').delete().eq('id', roleId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Erreur lors de la suppression du rôle:', error)
    return { error }
  }
}

// =====================================================
// GESTION DES FONCTIONNALITÉS
// =====================================================

/**
 * Récupère toutes les fonctionnalités
 *
export const getFeatures = async () => {
  try {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erreur lors de la récupération des fonctionnalités:', error)
    return { data: null, error }
  }
}

/**
 * Crée une nouvelle fonctionnalité
 *
export const createFeature = async featureData => {
  try {
    const { data, error } = await supabase
      .from('features')
      .insert([featureData])
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erreur lors de la création de la fonctionnalité:', error)
    return { data: null, error }
  }
}

/**
 * Met à jour une fonctionnalité
 *
export const updateFeature = async (featureId, updates) => {
  try {
    const { data, error } = await supabase
      .from('features')
      .update(updates)
      .eq('id', featureId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la fonctionnalité:', error)
    return { data: null, error }
  }
}

/**
 * Supprime une fonctionnalité
 *
export const deleteFeature = async featureId => {
  try {
    // D'abord, supprimer toutes les permissions associées
    const { error: permissionsError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('feature_id', featureId)

    if (permissionsError) {
      console.error(
        'Erreur lors de la suppression des permissions:',
        permissionsError
      )
      throw permissionsError
    }

    // Ensuite, supprimer la fonctionnalité
    const { error: featureError } = await supabase
      .from('features')
      .delete()
      .eq('id', featureId)

    if (featureError) {
      console.error(
        'Erreur lors de la suppression de la fonctionnalité:',
        featureError
      )
      throw featureError
    }

    console.log(
      '✅ Fonctionnalité et permissions associées supprimées avec succès'
    )
    return { error: null }
  } catch (error) {
    console.error('Erreur lors de la suppression de la fonctionnalité:', error)
    return { error }
  }
}

// =====================================================
// GESTION DES PERMISSIONS
// =====================================================

/**
 * Récupère toutes les permissions pour un rôle
 *
export const getRolePermissions = async roleId => {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(
        `
        *,
        features (
          id,
          name,
          display_name,
          description,
          category
        )
      `
      )
      .eq('role_id', roleId)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error)
    return { data: null, error }
  }
}

/**
 * Récupère toutes les permissions de tous les rôles
 *
export const getAllPermissions = async () => {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(
        `
        *,
        roles (
          id,
          name,
          display_name
        ),
        features (
          id,
          name,
          display_name,
          category
        )
      `
      )
      .order('roles(name)', { ascending: true })
      .order('features(category)', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error(
      'Erreur lors de la récupération de toutes les permissions:',
      error
    )
    return { data: null, error }
  }
}

/**
 * Met à jour les permissions d'un rôle
 *
export const updateRolePermissions = async (roleId, permissions) => {
  try {
    console.log('🔄 Mise à jour des permissions pour le rôle:', roleId)
    console.log('📋 Permissions reçues:', permissions)

    // Validation des données reçues
    if (!Array.isArray(permissions)) {
      throw new Error('Les permissions doivent être un tableau')
    }

    if (!roleId) {
      throw new Error('roleId est requis')
    }

    // Vérifier que chaque permission a la structure attendue (modèle simplifié)
    const validPermissions = permissions.filter(p => {
      const isValid =
        p && p.role_id && p.feature_id && typeof p.can_access === 'boolean'
      if (!isValid) {
        console.warn('⚠️ Permission invalide ignorée:', p)
      }
      return isValid
    })

    console.log('✅ Permissions valides:', validPermissions.length)

    // Supprimer les anciennes permissions
    console.log('🗑️ Suppression des anciennes permissions...')
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression:', deleteError)
      throw deleteError
    }

    console.log('✅ Anciennes permissions supprimées')

    // Insérer les nouvelles permissions
    if (validPermissions.length > 0) {
      console.log('➕ Insertion des nouvelles permissions...')

      // Préparer les données pour l'insertion (approche unifiée)
      const permissionsToInsert = validPermissions.map(p => ({
        role_id: p.role_id,
        feature_id: p.feature_id,
        can_access: p.can_access || false,
        // Approche unifiée : seul can_access est nécessaire
      }))

      console.log('📝 Données à insérer:', permissionsToInsert)

      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(permissionsToInsert)

      if (insertError) {
        console.error("❌ Erreur lors de l'insertion:", insertError)
        throw insertError
      }

      console.log('✅ Nouvelles permissions insérées')
    } else {
      console.log('ℹ️ Aucune permission valide à insérer')
    }

    console.log('✅ Mise à jour des permissions terminée avec succès')
    return { error: null }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des permissions:', error)
    return { error }
  }
}

// =====================================================
// GESTION DES UTILISATEURS
// =====================================================

/**
 * Récupère tous les utilisateurs avec leurs rôles
 *
export const getUsersWithRoles = async () => {
  try {
    // Approche en 2 étapes pour éviter les problèmes de relations
    // 1. Récupérer tous les profils (sans email)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, pseudo, is_admin, created_at')
      .order('created_at', { ascending: false })

    if (profilesError) throw profilesError

    // 2. Récupérer les rôles pour chaque utilisateur
    const usersWithRoles = await Promise.all(
      profiles.map(async profile => {
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select(
            `
            id,
            is_active,
            assigned_at,
            roles (
              id,
              name,
              display_name,
              description
            )
          `
          )
          .eq('user_id', profile.id)
          .eq('is_active', true)

        if (userRolesError) {
          console.warn(
            `Erreur lors de la récupération des rôles pour ${profile.id}:`,
            userRolesError
          )
          return {
            ...profile,
            user_roles: [],
          }
        }

        return {
          ...profile,
          user_roles: userRoles || [],
        }
      })
    )

    return { data: usersWithRoles, error: null }
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    return { data: null, error }
  }
}

/**
 * Récupère les rôles d'un utilisateur
 *
export const getUserRoles = async userId => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(
        `
        *,
        roles (
          id,
          name,
          display_name,
          description
        )
      `
      )
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des rôles utilisateur:',
      error
    )
    return { data: null, error }
  }
}

/**
 * Assigne un rôle à un utilisateur
 *
export const assignRoleToUser = async (userId, roleId) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role_id: roleId,
        is_active: true,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error("Erreur lors de l'assignation du rôle:", error)
    return { data: null, error }
  }
}

/**
 * Retire un rôle d'un utilisateur
 *
export const removeRoleFromUser = async (userId, roleId) => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Erreur lors de la suppression du rôle:', error)
    return { data: null, error }
  }
}

// Fonction getUserPermissions supprimée - elle est définie dans usePermissionsAPI.js

// =====================================================
// HISTORIQUE DES CHANGEMENTS
// =====================================================

/**
 * Récupère l'historique des changements de permissions
 *
export const getPermissionHistory = async (limit = 50) => {
  try {
    // Requête simplifiée avec seulement les colonnes qui existent
    const { data, error } = await supabase
      .from('permission_changes')
      .select(
        `
        id,
        change_type,
        table_name,
        record_id,
        old_values,
        new_values,
        changed_by
      `
      )
      .order('id', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique:", error)
    return { data: null, error }
  }
}

/**
 * Enregistre un changement de permission
 *
export const logPermissionChange = async changeData => {
  try {
    const { data, error } = await supabase
      .from('permission_changes')
      .insert([
        {
          ...changeData,
          changed_by: supabase.auth.user()?.id,
          changed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du changement:", error)
    return { data: null, error }
  }
}
*/
import { isAbortLike, withAbortSafe } from '@/hooks'
import { supabase } from './supabaseClient'

// Log d'erreur "safe"
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

// =====================================================
// GESTION DES RÔLES
// =====================================================

// Fonction pour récupérer tous les rôles (admin uniquement)
export const getRoles = async () => {
  const { data, error, aborted } = await withAbortSafe(
    supabase.from('roles').select('*').order('priority', { ascending: true })
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(
      `Erreur lors de la récupération des rôles: ${formatErr(error)}`
    )
    return { data: null, error }
  }
  return { data, error: null }
}

// Fonction pour récupérer seulement les rôles actifs (pour les sélections utilisateur)
export const getActiveRoles = async () => {
  const { data, error, aborted } = await withAbortSafe(
    supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(
      `Erreur lors de la récupération des rôles actifs: ${formatErr(error)}`
    )
    return { data: null, error }
  }
  return { data, error: null }
}

export const createRole = async roleData => {
  const { data, error, aborted } = await withAbortSafe(
    supabase.from('roles').insert([roleData]).select().single()
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(`Erreur lors de la création du rôle: ${formatErr(error)}`)
    return { data: null, error }
  }
  return { data, error: null }
}

export const updateRole = async (roleId, updates) => {
  const { data, error, aborted } = await withAbortSafe(
    supabase.from('roles').update(updates).eq('id', roleId).select().single()
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(`Erreur lors de la mise à jour du rôle: ${formatErr(error)}`)
    return { data: null, error }
  }
  return { data, error: null }
}

export const deleteRole = async roleId => {
  const { error, aborted } = await withAbortSafe(
    supabase.from('roles').delete().eq('id', roleId)
  )
  if (aborted || (error && isAbortLike(error))) return { error: null }
  if (error) {
    console.error(`Erreur lors de la suppression du rôle: ${formatErr(error)}`)
    return { error }
  }
  return { error: null }
}

// =====================================================
// GESTION DES FONCTIONNALITÉS
// =====================================================

export const getFeatures = async () => {
  const { data, error, aborted } = await withAbortSafe(
    supabase
      .from('features')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(
      `Erreur lors de la récupération des fonctionnalités: ${formatErr(error)}`
    )
    return { data: null, error }
  }
  return { data, error: null }
}

export const createFeature = async featureData => {
  const { data, error, aborted } = await withAbortSafe(
    supabase.from('features').insert([featureData]).select().single()
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(
      `Erreur lors de la création de la fonctionnalité: ${formatErr(error)}`
    )
    return { data: null, error }
  }
  return { data, error: null }
}

export const updateFeature = async (featureId, updates) => {
  const { data, error, aborted } = await withAbortSafe(
    supabase
      .from('features')
      .update(updates)
      .eq('id', featureId)
      .select()
      .single()
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(
      `Erreur lors de la mise à jour de la fonctionnalité: ${formatErr(error)}`
    )
    return { data: null, error }
  }
  return { data, error: null }
}

export const deleteFeature = async featureId => {
  // 1) supprimer les permissions associées
  const { error: permissionsError, aborted: delPermAborted } =
    await withAbortSafe(
      supabase.from('role_permissions').delete().eq('feature_id', featureId)
    )
  if (delPermAborted || (permissionsError && isAbortLike(permissionsError)))
    return { error: null }
  if (permissionsError) {
    console.error(
      `Erreur lors de la suppression des permissions: ${formatErr(permissionsError)}`
    )
    return { error: permissionsError }
  }
  // 2) supprimer la feature
  const { error: featureError, aborted: delFeatAborted } = await withAbortSafe(
    supabase.from('features').delete().eq('id', featureId)
  )
  if (delFeatAborted || (featureError && isAbortLike(featureError)))
    return { error: null }
  if (featureError) {
    console.error(
      `Erreur lors de la suppression de la fonctionnalité: ${formatErr(featureError)}`
    )
    return { error: featureError }
  }
  console.log(
    '✅ Fonctionnalité et permissions associées supprimées avec succès'
  )
  return { error: null }
}

// =====================================================
// GESTION DES PERMISSIONS
// =====================================================

export const getRolePermissions = async roleId => {
  const { data, error, aborted } = await withAbortSafe(
    supabase
      .from('role_permissions')
      .select(
        `
        *,
        features (
          id,
          name,
          display_name,
          description,
          category
        )
      `
      )
      .eq('role_id', roleId)
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(
      `Erreur lors de la récupération des permissions: ${formatErr(error)}`
    )
    return { data: null, error }
  }
  return { data, error: null }
}

export const getAllPermissions = async () => {
  const { data, error, aborted } = await withAbortSafe(
    supabase
      .from('role_permissions')
      .select(
        `
        *,
        roles ( id, name, display_name ),
        features ( id, name, display_name, category )
      `
      )
      .order('roles(name)', { ascending: true })
      .order('features(category)', { ascending: true })
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(
      `Erreur lors de la récupération de toutes les permissions: ${formatErr(error)}`
    )
    return { data: null, error }
  }
  return { data, error: null }
}

export const updateRolePermissions = async (roleId, permissions) => {
  try {
    if (!Array.isArray(permissions))
      throw new Error('Les permissions doivent être un tableau')
    if (!roleId) throw new Error('roleId est requis')

    const valid = permissions.filter(p => {
      const ok =
        p && p.role_id && p.feature_id && typeof p.can_access === 'boolean'
      if (!ok) console.warn('⚠️ Permission invalide ignorée:', p)
      return ok
    })

    // delete anciennes
    const { error: delErr, aborted: delAborted } = await withAbortSafe(
      supabase.from('role_permissions').delete().eq('role_id', roleId)
    )
    if (!(delAborted || (delErr && isAbortLike(delErr))) && delErr) {
      console.error(`❌ Erreur lors de la suppression: ${formatErr(delErr)}`)
      return { error: delErr }
    }

    if (valid.length === 0) return { error: null }

    const toInsert = valid.map(p => ({
      role_id: p.role_id,
      feature_id: p.feature_id,
      can_access: !!p.can_access,
    }))

    const { error: insErr, aborted: insAborted } = await withAbortSafe(
      supabase.from('role_permissions').insert(toInsert)
    )
    if (insAborted || (insErr && isAbortLike(insErr))) return { error: null }
    if (insErr) {
      console.error(`❌ Erreur lors de l'insertion: ${formatErr(insErr)}`)
      return { error: insErr }
    }

    return { error: null }
  } catch (error) {
    console.error(
      `❌ Erreur lors de la mise à jour des permissions: ${formatErr(error)}`
    )
    return { error }
  }
}

// =====================================================
// GESTION DES UTILISATEURS
// =====================================================

export const getUsersWithRoles = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    roleFilter = 'all',
    statusFilter = 'all',
  } = options

  // Calculer l'offset pour la pagination
  const offset = (page - 1) * limit

  // Construire la requête de base
  let query = supabase
    .from('profiles')
    .select('id, pseudo, is_admin, created_at, account_status')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Appliquer le filtre de statut si nécessaire
  if (statusFilter !== 'all') {
    query = query.eq('account_status', statusFilter)
  }

  const {
    data: profiles,
    error: profilesError,
    aborted: profAborted,
  } = await withAbortSafe(query)
  if (profAborted || (profilesError && isAbortLike(profilesError)))
    return { data: [], error: null }
  if (profilesError) {
    console.error(
      `Erreur lors de la récupération des utilisateurs: ${formatErr(profilesError)}`
    )
    return { data: null, error: profilesError }
  }

  // Récupérer les emails via RPC
  const { data: emails } = await supabase.rpc('get_user_emails')
  const emailMap =
    emails?.reduce((acc, item) => {
      acc[item.user_id] = item.email
      return acc
    }, {}) || {}

  // Récupérer les dernières connexions via RPC
  const { data: lastLogins } = await supabase.rpc('get_user_last_logins')
  const loginMap =
    lastLogins?.reduce((acc, item) => {
      acc[item.user_id] = {
        last_login: item.last_login,
        is_online: item.is_online,
      }
      return acc
    }, {}) || {}

  // rôles par user
  const usersWithRoles = await Promise.all(
    (profiles || []).map(async profile => {
      const {
        data: userRoles,
        error: userRolesError,
        aborted: urAborted,
      } = await withAbortSafe(
        supabase
          .from('user_roles')
          .select(
            `
            id,
            is_active,
            assigned_at,
            roles!inner ( id, name, display_name, description, is_active )
          `
          )
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .eq('roles.is_active', true)
      )
      if (urAborted || (userRolesError && isAbortLike(userRolesError))) {
        return {
          ...profile,
          user_roles: [],
          email: emailMap[profile.id] || null,
          last_login: loginMap[profile.id]?.last_login || null,
          is_online: loginMap[profile.id]?.is_online || false,
        }
      }
      if (userRolesError) {
        console.warn(
          `Erreur rôles pour ${profile.id}: ${formatErr(userRolesError)}`
        )
        return {
          ...profile,
          user_roles: [],
          email: emailMap[profile.id] || null,
          last_login: loginMap[profile.id]?.last_login || null,
          is_online: loginMap[profile.id]?.is_online || false,
        }
      }
      return {
        ...profile,
        user_roles: userRoles || [],
        email: emailMap[profile.id] || null,
        last_login: loginMap[profile.id]?.last_login || null,
        is_online: loginMap[profile.id]?.is_online || false,
      }
    })
  )

  // Récupérer le nombre total d'utilisateurs pour la pagination
  let countQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
  if (statusFilter !== 'all') {
    countQuery = countQuery.eq('account_status', statusFilter)
  }
  const { count: totalUsers } = await countQuery

  // Appliquer le filtre par rôle côté client (après récupération des rôles)
  let filteredUsers = usersWithRoles
  if (roleFilter !== 'all') {
    filteredUsers = usersWithRoles.filter(user => {
      if (roleFilter === 'admin') {
        return user.is_admin
      }
      if (roleFilter === 'no_roles') {
        return !user.user_roles || user.user_roles.length === 0
      }
      // Filtre par nom de rôle
      return user.user_roles?.some(
        userRole => userRole.roles?.name === roleFilter
      )
    })
  }

  return {
    data: filteredUsers,
    error: null,
    pagination: {
      page,
      limit,
      total: totalUsers || 0,
      totalPages: Math.ceil((totalUsers || 0) / limit),
    },
  }
}

export const getUserRoles = async userId => {
  const { data, error, aborted } = await withAbortSafe(
    supabase
      .from('user_roles')
      .select(
        `
        *,
        roles ( id, name, display_name, description )
      `
      )
      .eq('user_id', userId)
      .eq('is_active', true)
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(`Erreur rôles utilisateur: ${formatErr(error)}`)
    return { data: null, error }
  }
  return { data, error: null }
}

export const assignRoleToUser = async (userId, roleId) => {
  const payload = {
    user_id: userId,
    role_id: roleId,
    is_active: true,
    assigned_at: new Date().toISOString(),
  }
  const { data, error, aborted } = await withAbortSafe(
    supabase.from('user_roles').upsert(payload).select().single()
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(`Erreur lors de l'assignation du rôle: ${formatErr(error)}`)
    return { data: null, error }
  }
  return { data, error: null }
}

export const removeRoleFromUser = async (userId, roleId) => {
  const { error, aborted } = await withAbortSafe(
    supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
  )
  if (aborted || (error && isAbortLike(error))) return { error: null }
  if (error) {
    console.error(`Erreur lors de la suppression du rôle: ${formatErr(error)}`)
    return { error }
  }
  return { error: null }
}

// =====================================================
// HISTORIQUE DES CHANGEMENTS
// =====================================================

export const getPermissionHistory = async (limit = 50) => {
  const { data, error, aborted } = await withAbortSafe(
    supabase
      .from('permission_changes')
      .select(
        `
        id, 
        change_type, 
        table_name, 
        record_id, 
        old_values, 
        new_values, 
        changed_by,
        changed_at,
        created_at
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit)
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(
      `Erreur lors de la récupération de l'historique: ${formatErr(error)}`
    )
    return { data: null, error }
  }

  // Récupérer les pseudos des utilisateurs séparément si needed
  const userIds = data?.map(item => item.changed_by).filter(Boolean) || []
  const uniqueUserIds = [...new Set(userIds)]
  let userProfiles = {}

  if (uniqueUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, pseudo')
      .in('id', uniqueUserIds)

    userProfiles =
      profiles?.reduce((acc, profile) => {
        acc[profile.id] = profile.pseudo
        return acc
      }, {}) || {}
  }

  // Enrichir les données avec les pseudos
  const enrichedData = data?.map(item => ({
    ...item,
    user_pseudo: userProfiles[item.changed_by] || 'Utilisateur inconnu',
  }))

  return { data: enrichedData, error: null }
}

export const logPermissionChange = async changeData => {
  const payload = {
    ...changeData,
    changed_by: supabase.auth.user()?.id,
    changed_at: new Date().toISOString(),
  }
  const { data, error, aborted } = await withAbortSafe(
    supabase.from('permission_changes').insert([payload]).select().single()
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(
      `Erreur lors de l'enregistrement du changement: ${formatErr(error)}`
    )
    return { data: null, error }
  }
  return { data, error: null }
}

/**
 * Récupère toutes les permissions d'un utilisateur via RPC
 */
export const getUserPermissions = async userId => {
  const { data, error, aborted } = await withAbortSafe(
    supabase.rpc('get_user_permissions', { user_uuid: userId })
  )
  if (aborted || (error && isAbortLike(error)))
    return { data: null, error: null }
  if (error) {
    console.error(`Erreur permissions utilisateur: ${formatErr(error)}`)
    return { data: null, error }
  }
  return { data, error: null }
}
