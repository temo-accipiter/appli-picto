// src/utils/getDisplayPseudo.ts
import type { User } from '@supabase/supabase-js'

export function getDisplayPseudo(
  user: User | null | undefined,
  dbPseudo?: string | null
): string {
  const fromDb = (dbPseudo ?? '').trim()
  if (fromDb) return fromDb

  const fromMeta = (user?.user_metadata?.pseudo ?? '').trim()
  if (fromMeta) return fromMeta

  const fromEmail = (user?.email ?? '').split('@')[0]
  return fromEmail || 'Utilisateur'
}
