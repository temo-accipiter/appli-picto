'use client'

import './global-error.scss'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body>
        <div className="global-error">
          <h1 className="global-error__icon">⚠️ Une erreur est survenue</h1>
          <p className="global-error__message">
            {error.message || 'Erreur inconnue'}
          </p>
          <button onClick={reset} className="global-error__action">
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
