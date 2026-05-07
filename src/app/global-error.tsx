'use client'

import './global-error.scss'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body>
        <div className="global-error">
          <p className="global-error__icon">⚠️</p>
          <button onClick={reset} className="global-error__action">
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
