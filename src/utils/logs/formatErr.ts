// Helper de logs : formate les erreurs Supabase/JS en message clair et lisible

interface ErrorLike {
  message?: string
  code?: string
  details?: string
  hint?: string
}

export default function formatErr(e: unknown): string {
  const err = e as ErrorLike
  const m = String(err?.message ?? e)
  const parts = [
    m,
    err?.code ? `[${err.code}]` : '',
    err?.details ? `— ${err.details}` : '',
    err?.hint ? `(hint: ${err.hint})` : '',
  ].filter(Boolean)
  return parts.join(' ')
}
