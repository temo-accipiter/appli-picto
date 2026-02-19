'use client'

/**
 * ChildProfileContext — Gestion du profil enfant actif (S2)
 *
 * Rôle :
 * - Centralise l'accès aux profils enfants du compte.
 * - Expose l'enfant "actif" (état UI local, persisté en localStorage).
 * - Fournit les actions : choisir un profil, en créer un nouveau.
 *
 * ⚠️ RÈGLES DB-FIRST (non négociables)
 * - Aucune logique de quota côté client.
 * - "locked" est lu depuis la DB, jamais déduit côté front.
 * - Visitor (user=null) → aucun appel DB, contexte vide.
 *
 * ⚠️ RÈGLE ANTI-CHOC TSA
 * - setActiveChildId déclenche un "Chargement du Contexte Tableau"
 *   (les pages consommatrices rechargent leur état à partir du nouvel enfant actif).
 * - Le changement ne modifie jamais un Tableau déjà affiché.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import useChildProfiles, { type ChildProfile } from '@/hooks/useChildProfiles'
import useAuth from '@/hooks/useAuth'

// Clé localStorage — namespaced par user.id pour éviter les collisions multi-compte
const storageKey = (userId: string) => `applipicto:activeChild:${userId}`

// ─── Interface du contexte ────────────────────────────────────────────────────

interface ChildProfileContextValue {
  /** Liste de tous les profils enfants du compte (triés par created_at ASC) */
  childProfiles: ChildProfile[]
  /** Profil enfant actuellement sélectionné (null si visitor ou aucun profil) */
  activeChildProfile: ChildProfile | null
  /** ID du profil enfant actif (état UI local, persisté en localStorage) */
  activeChildId: string | null
  /**
   * Changer l'enfant actif.
   * Déclenche un rechargement du contexte dans les pages consommatrices.
   */
  setActiveChildId: (id: string) => void
  /** Chargement des profils en cours */
  loading: boolean
  /** Erreur de lecture (à afficher côté adulte seulement, jamais en Tableau) */
  error: Error | null
  /**
   * Créer un nouveau profil enfant (DB-first, sans quota check côté client).
   * Retourne { profile, error } — error est un message UX neutre (non technique).
   */
  createChildProfile: (
    name: string
  ) => Promise<{ profile: ChildProfile | null; error: string | null }>
  /** Rafraîchir la liste depuis la DB */
  refetchProfiles: () => void
}

// ─── Création du contexte ─────────────────────────────────────────────────────

export const ChildProfileContext =
  createContext<ChildProfileContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ChildProfileProviderProps {
  children: ReactNode
}

export function ChildProfileProvider({ children }: ChildProfileProviderProps) {
  const { user, authReady } = useAuth()
  const { profiles, loading, error, refetch, createProfile } =
    useChildProfiles()

  // ── État local : ID du profil enfant actif ──────────────────────────────────
  // Initialisé à null — chargé depuis localStorage via useEffect une fois user.id disponible.
  // (Initialisation lazy dans useState ne supporte pas les clés namespaced par user.id)
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null)

  // ── Chargement depuis localStorage quand user.id devient disponible ─────────
  const userId = user?.id
  useEffect(() => {
    if (!authReady || !userId) return
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(storageKey(userId))
    // null si rien de stocké → auto-sélection via l'effet suivant
    setActiveChildIdState(stored)
  }, [authReady, userId])

  // ── Persistance de l'ID actif en localStorage (clé namespaced par user.id) ─
  const setActiveChildId = useCallback(
    (id: string) => {
      setActiveChildIdState(id)
      if (typeof window !== 'undefined' && userId) {
        localStorage.setItem(storageKey(userId), id)
      }
    },
    [userId]
  )

  // ── Ref pour conserver le userId au moment du logout ─────────────────────────
  const prevUserIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (userId) prevUserIdRef.current = userId
  }, [userId])

  // ── Sélection automatique du profil actif ───────────────────────────────────
  // Quand la liste est chargée :
  // 1. Si l'ID stocké existe et correspond à un profil actif → le conserver.
  // 2. Sinon → sélectionner automatiquement le premier profil "active" (stable, created_at ASC).
  // Jamais sélectionner un profil "locked".
  useEffect(() => {
    if (loading || profiles.length === 0) return

    const activeProfiles = profiles.filter(p => p.status === 'active')
    if (activeProfiles.length === 0) return

    const storedIsValid =
      activeChildId !== null && activeProfiles.some(p => p.id === activeChildId)

    // Extraire dans une variable : TypeScript ne narrow pas array[0] via length > 0
    const firstActive = activeProfiles[0]
    if (!storedIsValid && firstActive !== undefined) {
      setActiveChildId(firstActive.id)
    }
  }, [profiles, loading, activeChildId, setActiveChildId])

  // ── Réinitialiser l'ID actif au logout ─────────────────────────────────────
  useEffect(() => {
    if (authReady && !user) {
      setActiveChildIdState(null)
      // Nettoyer la clé namespaced de l'utilisateur précédent
      if (typeof window !== 'undefined' && prevUserIdRef.current) {
        localStorage.removeItem(storageKey(prevUserIdRef.current))
        prevUserIdRef.current = undefined
      }
    }
  }, [user, authReady])

  // ── Profil actif résolu ──────────────────────────────────────────────────────
  const activeChildProfile = useMemo<ChildProfile | null>(() => {
    if (!activeChildId || profiles.length === 0) return null
    return profiles.find(p => p.id === activeChildId) ?? null
  }, [activeChildId, profiles])

  // ── Wrapping de createProfile ────────────────────────────────────────────────
  const createChildProfile = useCallback(
    async (
      name: string
    ): Promise<{ profile: ChildProfile | null; error: string | null }> => {
      const result = await createProfile(name)
      // Si succès, activer automatiquement le nouveau profil
      if (result.profile) {
        setActiveChildId(result.profile.id)
      }
      return result
    },
    [createProfile, setActiveChildId]
  )

  // ── Valeur du contexte (memoïsée pour éviter re-renders) ────────────────────
  const value = useMemo<ChildProfileContextValue>(
    () => ({
      childProfiles: profiles,
      activeChildProfile,
      activeChildId,
      setActiveChildId,
      loading,
      error,
      createChildProfile,
      refetchProfiles: refetch,
    }),
    [
      profiles,
      activeChildProfile,
      activeChildId,
      setActiveChildId,
      loading,
      error,
      createChildProfile,
      refetch,
    ]
  )

  return (
    <ChildProfileContext.Provider value={value}>
      {children}
    </ChildProfileContext.Provider>
  )
}

// ─── Hook consommateur ────────────────────────────────────────────────────────

/**
 * Accès au contexte des profils enfants.
 *
 * @example
 * ```tsx
 * const { activeChildProfile, setActiveChildId } = useChildProfile()
 * ```
 */
export function useChildProfile(): ChildProfileContextValue {
  const ctx = useContext(ChildProfileContext)
  if (!ctx) {
    throw new Error(
      '[useChildProfile] Doit être utilisé dans un ChildProfileProvider'
    )
  }
  return ctx
}

export default ChildProfileProvider
