/**
 * Utilitaires pour la gestion des rôles
 */

// Rôles système protégés qui ne peuvent pas être supprimés
export const SYSTEM_ROLES = ['admin', 'visitor', 'free', 'abonne', 'staff']

// Priorités par défaut des rôles système
export const SYSTEM_ROLE_PRIORITIES = {
  admin: 100,
  staff: 80,
  abonne: 50,
  free: 20,
  visitor: 10,
}

/**
 * Vérifie si un rôle est un rôle système protégé
 * @param {string} roleName - Nom du rôle à vérifier
 * @returns {boolean} True si c'est un rôle système
 */
export const isSystemRole = roleName => {
  return SYSTEM_ROLES.includes(roleName)
}

/**
 * Vérifie si un rôle peut être supprimé
 * @param {string} roleName - Nom du rôle
 * @returns {boolean} True si le rôle peut être supprimé
 */
export const canDeleteRole = roleName => {
  return !isSystemRole(roleName)
}

/**
 * Vérifie si un rôle peut être modifié (nom, description, etc.)
 * @param {string} roleName - Nom du rôle
 * @returns {boolean} True si le rôle peut être modifié
 */
export const canModifyRole = roleName => {
  return !isSystemRole(roleName)
}

/**
 * Vérifie si un rôle peut être activé/désactivé
 * @param {string} roleName - Nom du rôle
 * @returns {boolean} True si le rôle peut être activé/désactivé
 */
export const canToggleRole = roleName => {
  return isSystemRole(roleName)
}

/**
 * Filtre les rôles actifs pour l'affichage
 * @param {Array} roles - Liste des rôles
 * @returns {Array} Rôles actifs
 */
export const getActiveRoles = roles => {
  return roles.filter(role => role.is_active)
}

/**
 * Filtre les rôles actifs et non-système pour la sélection utilisateur
 * @param {Array} roles - Liste des rôles
 * @returns {Array} Rôles disponibles pour attribution
 */
export const getAvailableRoles = roles => {
  return roles.filter(role => role.is_active && role.name !== 'admin')
}

/**
 * Obtient la priorité d'un rôle
 * @param {string} roleName - Nom du rôle
 * @returns {number} Priorité du rôle
 */
export const getRolePriority = roleName => {
  return SYSTEM_ROLE_PRIORITIES[roleName] || 0
}

/**
 * Trie les rôles par priorité (décroissante)
 * @param {Array} roles - Liste des rôles
 * @returns {Array} Rôles triés par priorité
 */
export const sortRolesByPriority = roles => {
  return [...roles].sort((a, b) => {
    const priorityA = getRolePriority(a.name)
    const priorityB = getRolePriority(b.name)
    return priorityB - priorityA
  })
}

/**
 * Obtient le nom d'affichage d'un rôle
 * @param {Object} role - Objet rôle
 * @returns {string} Nom d'affichage du rôle
 */
export const getRoleDisplayName = role => {
  if (role.display_name) {
    return role.display_name
  }

  // Noms d'affichage par défaut pour les rôles système
  const defaultNames = {
    admin: 'Administrateur',
    staff: 'Équipe',
    abonne: 'Abonné',
    free: 'Gratuit',
    visitor: 'Visiteur',
  }

  return defaultNames[role.name] || role.name
}

/**
 * Obtient la description d'un rôle
 * @param {Object} role - Objet rôle
 * @returns {string} Description du rôle
 */
export const getRoleDescription = role => {
  if (role.description) {
    return role.description
  }

  // Descriptions par défaut pour les rôles système
  const defaultDescriptions = {
    admin: 'Administrateur avec tous les droits',
    staff: "Membre de l'équipe avec accès privilégié",
    abonne: 'Utilisateur abonné avec accès complet',
    free: 'Utilisateur avec accès gratuit limité',
    visitor: 'Visiteur avec accès limité',
  }

  return defaultDescriptions[role.name] || 'Rôle personnalisé'
}
