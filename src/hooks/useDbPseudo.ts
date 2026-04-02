'use client'

import { useMemo } from 'react'
import useAuth from './useAuth'

/**
 * Hook pour récupérer un libellé utilisateur stable sans table legacy.
 *
 * @param userId - ID de l'utilisateur (optionnel)
 * @returns Libellé utilisateur (metadata -> email -> "Compte")
 */
export function useDbPseudo(userId: string | undefined): string {
  const { user } = useAuth()

  return useMemo(() => {
    if (!userId || !user || user.id !== userId) return ''

    const metadataLabel = String(
      user.user_metadata?.pseudo ||
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        ''
    ).trim()
    if (metadataLabel) return metadataLabel

    const emailLabel = (String(user.email || '').split('@')[0] ?? '').trim()
    if (emailLabel) return emailLabel

    return 'Compte'
  }, [user, userId])
}
