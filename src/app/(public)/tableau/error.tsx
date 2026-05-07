'use client'

export default function TableauError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="tableau-error">
      <p className="tableau-error__icon">🔄</p>
      <button onClick={reset} className="tableau-error__action">
        Réessayer
      </button>
    </div>
  )
}
