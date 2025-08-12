// src/utils/getDisplayPseudo.js
export function getDisplayPseudo(user, dbPseudo) {
  const fromDb = (dbPseudo ?? '').trim()
  if (fromDb) return fromDb

  const fromMeta = (user?.user_metadata?.pseudo ?? '').trim()
  if (fromMeta) return fromMeta

  const fromEmail = (user?.email ?? '').split('@')[0]
  return fromEmail || 'Utilisateur'
}
