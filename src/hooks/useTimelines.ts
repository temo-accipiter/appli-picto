// src/hooks/useTimelines.ts
// Lecture de la timeline pour un profil enfant (relation 1:1 avec child_profiles)
//
// ⚠️ DB-FIRST STRICT
// - La timeline est créée automatiquement par trigger DB lors de la création du profil.
// - Le front ne crée jamais de timeline (GRANT SELECT, UPDATE uniquement — pas INSERT/DELETE).
// - Relation 1:1 : UNIQUE(child_profile_id) → une seule timeline par enfant.
//
// ⚠️ COLONNES DISPONIBLES (migration 20260130109000_create_timelines.sql)
// - id, child_profile_id, created_at, updated_at
// - PAS de colonne `name` — renommage non supporté par le schéma DB actuel.

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import type { Database } from '@/types/supabase'

export type Timeline = Database['public']['Tables']['timelines']['Row']

// ─── Timeline locale pour visitor (non-DB) ─────────────────────────────────────
/**
 * Timeline locale implicite pour visitor (mode non connecté).
 * Permet au visitor d'utiliser la timeline/slots sans compte.
 * Conforme à ChildProfileContext.tsx (VISITOR_PROFILE).
 */
const VISITOR_TIMELINE: Timeline = {
  id: 'visitor-timeline-local',
  child_profile_id: 'visitor-local',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

interface UseTimelinesReturn {
  /** Timeline du profil enfant actif (null si aucun profil, chargement, ou pas encore créée) */
  timeline: Timeline | null
  /** Chargement de la lecture en cours */
  loading: boolean
  /** Erreur de lecture (DB ou réseau) */
  error: Error | null
}

/**
 * Lecture de la timeline pour un profil enfant (1:1).
 *
 * La timeline est créée automatiquement par trigger DB à la création du profil.
 * Ce hook ne fait que lire — pas d'INSERT, DELETE, ni renommage
 * (la colonne `name` n'existe pas dans la migration actuelle).
 *
 * @param childProfileId - ID du profil enfant actif (null = pas d'appel DB)
 *
 * @example
 * ```tsx
 * const { timeline, loading, error } = useTimelines(activeChildId)
 * ```
 */
export default function useTimelines(
  childProfileId: string | null
): UseTimelinesReturn {
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Pas de profil → pas d'appel DB, état vide immédiat
    if (!childProfileId) {
      setTimeline(null)
      setLoading(false)
      setError(null)
      return
    }

    // VISITOR mode → Retourner timeline locale (ZÉRO appel DB)
    // 'visitor-local' est un ID spécial qui ne doit jamais toucher la DB
    // Conformément à ChildProfileContext, visitor a un profil enfant local
    // → il doit aussi avoir une timeline locale pour pouvoir utiliser les slots
    if (childProfileId === 'visitor-local') {
      setTimeline(VISITOR_TIMELINE)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setTimeline(null)

    const fetchTimeline = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('timelines')
          .select('*')
          .eq('child_profile_id', childProfileId)
          .abortSignal(controller.signal)
          .maybeSingle()

        if (controller.signal.aborted) return
        if (fetchError) throw fetchError

        setTimeline(data)
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useTimelines] Erreur lecture timeline:', err)
        setError(err as Error)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchTimeline()

    return () => {
      controller.abort()
    }
  }, [childProfileId])

  return { timeline, loading, error }
}
