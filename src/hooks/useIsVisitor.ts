/**
 * Hook pour détecter si l'utilisateur est en mode Visitor
 *
 * Mode Visitor = utilisateur non connecté (!user)
 * Les données Visitor sont stockées localement (pas en DB)
 *
 * @example
 * ```tsx
 * const { isVisitor, authReady } = useIsVisitor()
 *
 * if (!authReady) return <Loader />
 *
 * if (isVisitor) {
 *   return <DemoCards />  // Afficher cartes démo
 * }
 *
 * return <UserCards />  // Afficher cartes utilisateur
 * ```
 */

import { useAuth } from '@/hooks'

interface UseIsVisitorReturn {
  /** true si utilisateur non connecté (mode Visitor) */
  isVisitor: boolean
  /** true si l'authentification est initialisée */
  authReady: boolean
}

/**
 * Détecte si l'utilisateur est en mode Visitor (non connecté)
 *
 * ⚠️ RÈGLES :
 * - Visitor = !user (pas connecté)
 * - Données Visitor = local-only (IndexedDB future en S10)
 * - TOUJOURS vérifier authReady avant isVisitor
 */
export default function useIsVisitor(): UseIsVisitorReturn {
  const { user, authReady } = useAuth()

  return {
    isVisitor: authReady && !user,
    authReady,
  }
}
