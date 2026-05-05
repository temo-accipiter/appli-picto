/**
 * Détermine si le Footer doit être affiché selon la route et l'état d'authentification.
 *
 * Règles :
 * - /tableau : toujours masqué (kiosk TSA — aucune distraction)
 * - Authentifié sur pages app (/edition, /profil, /admin, /abonnement) : masqué
 *   (liens légaux accessibles via carte RGPD du Profil)
 * - Visiteur sur /edition : masqué (NavbarVisiteur fournit les liens légaux)
 * - Sinon (pages publiques, légales, auth) : visible
 */
export function shouldShowFooter(
  pathname: string,
  isAuthenticated: boolean
): boolean {
  if (pathname === '/tableau') return false

  const authProtectedPages = ['/profil', '/admin', '/abonnement', '/edition']
  if (isAuthenticated && authProtectedPages.some(r => pathname.startsWith(r))) {
    return false
  }

  if (!isAuthenticated && pathname.startsWith('/edition')) return false

  return true
}
