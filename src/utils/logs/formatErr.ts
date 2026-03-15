// Helper de logs : formate les erreurs Supabase/JS en message clair et lisible

interface ErrorLike {
  message?: string
  code?: string
  details?: string
  hint?: string
}

export default function formatErr(e: unknown): string {
  if (typeof e === 'string' && e.trim()) return e

  if (e instanceof Error && e.message.trim()) {
    return e.message
  }

  const err = e as ErrorLike
  const parts = [
    typeof err?.message === 'string' && err.message.trim() ? err.message : '',
    err?.code ? `[${err.code}]` : '',
    err?.details ? `— ${err.details}` : '',
    err?.hint ? `(hint: ${err.hint})` : '',
  ].filter(Boolean)

  if (parts.length > 0) {
    return parts.join(' ')
  }

  return 'Erreur inconnue'
}
