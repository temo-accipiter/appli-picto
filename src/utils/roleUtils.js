/**
 * Utilitaires pour la gestion des rôles
 */

// Noms normalisés utiles partout dans l'app
export const ROLE = {
  ADMIN: 'admin',
  STAFF: 'staff',
  ABONNE: 'abonne',
  FREE: 'free',
  VISITOR: 'visitor',
}

// Rôles système protégés qui ne peuvent pas être supprimés
export const SYSTEM_ROLES = [
  ROLE.ADMIN,
  ROLE.VISITOR,
  ROLE.FREE,
  ROLE.ABONNE,
  ROLE.STAFF,
]

// Priorités par défaut des rôles système
export const SYSTEM_ROLE_PRIORITIES = {
  [ROLE.ADMIN]: 100,
  [ROLE.STAFF]: 80,
  [ROLE.ABONNE]: 50,
  [ROLE.FREE]: 20,
  [ROLE.VISITOR]: 10,
}

/** Normalise quelques synonymes éventuels (utile si la DB renvoie 'subscriber', etc.) */
export const normalizeRoleName = name => {
  if (!name) return ''
  const s = String(name).toLowerCase()
  if (s === 'subscriber') return ROLE.ABONNE
  if (s === 'gratuit' || s === 'free') return ROLE.FREE
  if (s === 'visiteur' || s === 'visitor') return ROLE.VISITOR
  return s
}

/** Vérifie si un rôle est un rôle système protégé */
export const isSystemRole = roleName => SYSTEM_ROLES.includes(roleName)

/** Vérifie si un rôle peut être supprimé */
export const canDeleteRole = roleName => !isSystemRole(roleName)

/** Vérifie si un rôle peut être modifié (nom, description, etc.) */
export const canModifyRole = roleName => !isSystemRole(roleName)

/** Vérifie si un rôle peut être activé/désactivé */
export const canToggleRole = roleName => isSystemRole(roleName)

/** Filtre les rôles actifs pour l'affichage */
export const getActiveRoles = roles => roles.filter(role => role.is_active)

/** Filtre les rôles actifs et non-système pour la sélection utilisateur */
export const getAvailableRoles = roles =>
  roles.filter(role => role.is_active && role.name !== ROLE.ADMIN)

/** Obtient la priorité d'un rôle */
export const getRolePriority = roleName => SYSTEM_ROLE_PRIORITIES[roleName] || 0

/** Trie les rôles par priorité (décroissante) */
export const sortRolesByPriority = roles => {
  return [...roles].sort((a, b) => {
    const priorityA = getRolePriority(a.name)
    const priorityB = getRolePriority(b.name)
    return priorityB - priorityA
  })
}

/** Obtient le nom d'affichage d'un rôle */
export const getRoleDisplayName = role => {
  if (role.display_name) return role.display_name
  const defaultNames = {
    [ROLE.ADMIN]: 'Administrateur',
    [ROLE.STAFF]: 'Équipe',
    [ROLE.ABONNE]: 'Abonné',
    [ROLE.FREE]: 'Gratuit',
    [ROLE.VISITOR]: 'Visiteur',
  }
  return defaultNames[role.name] || role.name
}

/** Obtient la description d'un rôle */
export const getRoleDescription = role => {
  if (role.description) return role.description
  const defaultDescriptions = {
    [ROLE.ADMIN]: 'Administrateur avec tous les droits',
    [ROLE.STAFF]: "Membre de l'équipe avec accès privilégié",
    [ROLE.ABONNE]: 'Utilisateur abonné avec accès complet',
    [ROLE.FREE]: 'Utilisateur avec accès gratuit limité',
    [ROLE.VISITOR]: 'Visiteur avec accès limité',
  }
  return defaultDescriptions[role.name] || 'Rôle personnalisé'
}
