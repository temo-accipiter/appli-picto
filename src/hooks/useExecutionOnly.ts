/**
 * Hook de détection du mode exécution-uniquement (§9 — Downgrade Subscriber → Free)
 *
 * ⚠️ USAGE COSMÉTIQUE UNIQUEMENT
 * Ce hook est destiné à l'affichage UI (banneau, désactivation boutons),
 * PAS à l'autorisation. La DB refuse les écritures structurelles via RLS BLOCKER 4.
 *
 * Quand est-on en execution-only ?
 * → Compte Free ayant dépassé la limite de profils enfants (après downgrade).
 *   RLS BLOCKER 4 : `is_execution_only()` retourne true côté DB.
 *   Le front NE JAMAIS compte les profils pour décider — la DB décide.
 *
 * Ce qui reste autorisé en execution-only :
 * - Exécution des timelines (sessions, validations) ✅
 * - Lecture de tous les contenus ✅
 *
 * Ce qui est bloqué (refus RLS) :
 * - CRUD cartes, catégories, timelines, slots, jetons ❌
 * - Création/modification profils enfants ❌
 *
 * @example
 * ```tsx
 * const { isExecutionOnly } = useExecutionOnly()
 * {isExecutionOnly && <ExecutionOnlyBanner />}
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import useAuth from './useAuth'

interface UseExecutionOnlyReturn {
  /**
   * true si le compte est en mode exécution-uniquement (downgrade §9).
   * false pour les Visitors (non connectés — local-only, §7.2).
   * false en cas d'erreur réseau (fallback sécurisé : ne pas bloquer l'utilisateur).
   */
  isExecutionOnly: boolean
  /** Chargement en cours */
  loading: boolean
  /**
   * Forcer une vérification depuis la DB (ex: après upgrade abonnement).
   * Utile pour rafraîchir l'état après un changement de statut.
   */
  refetch: () => void
}

/**
 * Détecte si le compte est en mode exécution-uniquement via RPC DB.
 *
 * ⚠️ RÈGLES CRITIQUES :
 * - Usage COSMÉTIQUE uniquement (affichage UI, désactivation boutons)
 * - NE PAS utiliser pour autorisation (DB-first via RLS BLOCKER 4)
 * - Visitor (user = null) → isExecutionOnly = false (non concerné §7.2)
 * - Erreur réseau → isExecutionOnly = false (fallback sécurisé)
 */
export default function useExecutionOnly(): UseExecutionOnlyReturn {
  const { user, authReady } = useAuth()

  const [isExecutionOnly, setIsExecutionOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  // Compteur pour déclencher un refetch manuel
  const [fetchTick, setFetchTick] = useState(0)

  useEffect(() => {
    // Auth pas encore initialisée → attendre
    if (!authReady) return

    // Visitor (pas d'user) → pas concerné par execution-only (§7.2)
    if (!user) {
      setIsExecutionOnly(false)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)

    const check = async () => {
      try {
        const { data, error } = await supabase
          .rpc('is_execution_only')
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return

        if (error) throw error

        setIsExecutionOnly(!!data)
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return

        console.error('[useExecutionOnly] Erreur RPC is_execution_only:', err)
        // Fallback sécurisé : ne pas bloquer l'utilisateur sur erreur réseau
        // Le RLS empêchera les modifications si nécessaire
        setIsExecutionOnly(false)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void check()

    return () => {
      controller.abort()
    }
  }, [user, authReady, fetchTick])

  const refetch = useCallback(() => {
    setFetchTick(t => t + 1)
  }, [])

  return { isExecutionOnly, loading, refetch }
}
