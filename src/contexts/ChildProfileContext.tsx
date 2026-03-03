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
 * - Visitor (user=null) → profil local implicite unique (ux.md §2566-2570)
 *
 * ⚠️ MODE VISITOR
 * - Profil local unique constant (id='visitor-local', name='Mon enfant')
 * - localStorage dédié : applipicto:visitor:activeChildId
 * - ZÉRO appel DB (données 100% locales)
 * - activeChildId TOUJOURS défini (jamais null)
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

// ─── Types UI (séparés du modèle DB) ──────────────────────────────────────────

/**
 * Shape UI minimale pour un profil enfant.
 * Utilisée pour mapper les profils DB ET créer le profil local visitor.
 * Évite les cast "as ChildProfile" avec des champs DB null.
 */
export interface ChildProfileUI {
  id: string
  name: string
  status: 'active' | 'locked'
}

// ─── Constantes VISITOR ────────────────────────────────────────────────────────

/**
 * Profil local implicite unique pour visitor (non-DB).
 * Conforme à ux.md §2566-2570 : "Visitor dispose implicitement d'un profil enfant local unique"
 */
const VISITOR_PROFILE: ChildProfileUI = {
  id: 'visitor-local',
  name: 'Mon enfant',
  status: 'active',
}

/**
 * Clé localStorage dédiée visitor (pas de userId).
 * Pour visitors : pas de namespacing userId (pas de compte).
 */
const VISITOR_STORAGE_KEY = 'applipicto:visitor:activeChildId'

/**
 * Clé localStorage pour utilisateurs authentifiés (namespaced par userId).
 * Pour éviter collisions multi-compte.
 */
const storageKey = (userId: string) => `applipicto:activeChild:${userId}`

// ─── Interface du contexte ────────────────────────────────────────────────────

interface ChildProfileContextValue {
  /** Liste de tous les profils enfants du compte (triés par created_at ASC) */
  childProfiles: ChildProfile[]
  /**
   * Profil enfant actuellement sélectionné (UI shape).
   * - Visitor : VISITOR_PROFILE constant (jamais null)
   * - Auth : profil DB mappé vers UI shape (ou null si aucun profil)
   */
  activeChildProfile: ChildProfileUI | null
  /**
   * ID du profil enfant actif (état UI local, persisté en localStorage).
   * - Visitor : 'visitor-local' (jamais null après authReady)
   * - Auth : id DB (ou null si aucun profil)
   */
  activeChildId: string | null
  /**
   * Changer l'enfant actif.
   * Déclenche un rechargement du contexte dans les pages consommatrices.
   * ⚠️ NON DISPONIBLE en mode visitor (profil unique, pas de switch).
   */
  setActiveChildId: (id: string) => void
  /** Chargement des profils en cours (toujours false pour visitor) */
  loading: boolean
  /** Erreur de lecture (à afficher côté adulte seulement, jamais en Tableau) */
  error: Error | null
  /**
   * Créer un nouveau profil enfant (DB-first, sans quota check côté client).
   * Retourne { profile, error } — error est un message UX neutre (non technique).
   * ⚠️ NON DISPONIBLE en mode visitor (pas de DB).
   */
  createChildProfile: (
    name: string
  ) => Promise<{ profile: ChildProfile | null; error: string | null }>
  /** Rafraîchir la liste depuis la DB (no-op pour visitor) */
  refetchProfiles: () => void
  /** Mode visitor détecté (authReady && !user) */
  isVisitor: boolean
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
  const userId = user?.id

  // ── Détection mode visitor ──────────────────────────────────────────────────
  const isVisitor = authReady && !user

  // ── Hooks DB (seulement si authentifié) ─────────────────────────────────────
  // useChildProfiles retourne [] si user=null, mais on ne l'appelle que si auth
  const {
    profiles: dbProfiles,
    loading: dbLoading,
    error: dbError,
    refetch: dbRefetch,
    createProfile: dbCreateProfile,
  } = useChildProfiles()

  // ── État local : ID du profil enfant actif ──────────────────────────────────
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null)

  // ── VISITOR : Charger depuis localStorage dédié ─────────────────────────────
  useEffect(() => {
    if (!isVisitor) return
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(VISITOR_STORAGE_KEY)
    // Pour visitor, on force toujours 'visitor-local' (id stable unique)
    // On stocke juste pour cohérence, mais on le force ici
    setActiveChildIdState(VISITOR_PROFILE.id)

    // Persister si pas encore fait
    if (stored !== VISITOR_PROFILE.id) {
      localStorage.setItem(VISITOR_STORAGE_KEY, VISITOR_PROFILE.id)
    }
  }, [isVisitor])

  // ── AUTH : Charger depuis localStorage namespaced ───────────────────────────
  useEffect(() => {
    if (!authReady || !userId) return
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(storageKey(userId))
    setActiveChildIdState(stored)
  }, [authReady, userId])

  // ── Persistance de l'ID actif en localStorage ───────────────────────────────
  const setActiveChildId = useCallback(
    (id: string) => {
      setActiveChildIdState(id)

      if (typeof window === 'undefined') return

      if (isVisitor) {
        // Visitor : localStorage dédié (pas de userId)
        localStorage.setItem(VISITOR_STORAGE_KEY, id)
      } else if (userId) {
        // Auth : localStorage namespaced
        localStorage.setItem(storageKey(userId), id)
      }
    },
    [isVisitor, userId]
  )

  // ── Ref pour conserver le userId au moment du logout ─────────────────────────
  const prevUserIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (userId) prevUserIdRef.current = userId
  }, [userId])

  // ── AUTH : Sélection automatique du profil actif ────────────────────────────
  useEffect(() => {
    // Seulement pour auth (pas visitor)
    if (isVisitor || !authReady || !userId) return
    if (dbLoading || dbProfiles.length === 0) return

    const activeProfiles = dbProfiles.filter(p => p.status === 'active')
    if (activeProfiles.length === 0) return

    const storedIsValid =
      activeChildId !== null && activeProfiles.some(p => p.id === activeChildId)

    const firstActive = activeProfiles[0]
    if (!storedIsValid && firstActive !== undefined) {
      setActiveChildId(firstActive.id)
    }
  }, [
    isVisitor,
    authReady,
    userId,
    dbProfiles,
    dbLoading,
    activeChildId,
    setActiveChildId,
  ])

  // ── Réinitialiser au logout (transition auth → visitor) ─────────────────────
  useEffect(() => {
    if (authReady && !user) {
      // Nettoyer la clé namespaced de l'utilisateur précédent
      if (typeof window !== 'undefined' && prevUserIdRef.current) {
        localStorage.removeItem(storageKey(prevUserIdRef.current))
        prevUserIdRef.current = undefined
      }

      // Passer en mode visitor : activeChildId sera réinitialisé par l'effet visitor
      setActiveChildIdState(null)
    }
  }, [user, authReady])

  // ── Profil actif résolu (UI shape) ──────────────────────────────────────────
  const activeChildProfile = useMemo<ChildProfileUI | null>(() => {
    if (isVisitor) {
      // Visitor : profil local constant
      return VISITOR_PROFILE
    }

    // Auth : mapper profil DB vers UI shape
    if (!activeChildId || dbProfiles.length === 0) return null
    const dbProfile = dbProfiles.find(p => p.id === activeChildId)
    if (!dbProfile) return null

    return {
      id: dbProfile.id,
      name: dbProfile.name,
      status: dbProfile.status,
    }
  }, [isVisitor, activeChildId, dbProfiles])

  // ── Wrapping createProfile (no-op pour visitor) ─────────────────────────────
  const createChildProfile = useCallback(
    async (
      name: string
    ): Promise<{ profile: ChildProfile | null; error: string | null }> => {
      if (isVisitor) {
        // Visitor : pas de DB, retour erreur neutre
        return {
          profile: null,
          error: 'Fonctionnalité non disponible en mode visiteur',
        }
      }

      const result = await dbCreateProfile(name)
      // Si succès, activer automatiquement le nouveau profil
      if (result.profile) {
        setActiveChildId(result.profile.id)
      }
      return result
    },
    [isVisitor, dbCreateProfile, setActiveChildId]
  )

  // ── Wrapping refetch (no-op pour visitor) ───────────────────────────────────
  const refetchProfiles = useCallback(() => {
    if (isVisitor) return // No-op pour visitor
    dbRefetch()
  }, [isVisitor, dbRefetch])

  // ── Valeur du contexte (memoïsée pour éviter re-renders) ────────────────────
  const value = useMemo<ChildProfileContextValue>(
    () => ({
      childProfiles: isVisitor ? [] : dbProfiles,
      activeChildProfile,
      activeChildId,
      setActiveChildId,
      loading: isVisitor ? false : dbLoading,
      error: isVisitor ? null : dbError,
      createChildProfile,
      refetchProfiles,
      isVisitor,
    }),
    [
      isVisitor,
      dbProfiles,
      activeChildProfile,
      activeChildId,
      setActiveChildId,
      dbLoading,
      dbError,
      createChildProfile,
      refetchProfiles,
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
