'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { withAbortSafe, isAbortLike } from '@/hooks'

/**
 * Hook pour récupérer le pseudo d'un utilisateur depuis la DB
 * Gère automatiquement le fetch, l'annulation et les erreurs
 *
 * @param userId - ID de l'utilisateur (optionnel)
 * @returns Pseudo de l'utilisateur ou chaîne vide si non trouvé
 */
export function useDbPseudo(userId: string | undefined): string {
  const [pseudo, setPseudo] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    const fetchPseudo = async () => {
      if (!userId) return

      const { data, error, aborted } = await withAbortSafe<{
        pseudo: string | null
      }>(
        supabase
          .from('profiles')
          .select('pseudo')
          .eq('id', userId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single() as any
      )

      // Si le composant a été démonté, ne rien faire
      if (cancelled) return

      // Si requête annulée (abort), ne rien faire
      if (aborted || (error && isAbortLike(error))) return

      // Si erreur autre qu'abort, logger en dev
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            'useDbPseudo: Erreur fetch pseudo:',
            String(error?.message ?? error)
          )
        }
        return
      }

      // Mise à jour du pseudo
      setPseudo(data?.pseudo ?? '')
    }

    fetchPseudo()

    // Cleanup: marquer comme annulé si le composant se démonte
    return () => {
      cancelled = true
    }
  }, [userId])

  return pseudo
}
