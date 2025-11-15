'use client'

// src/components/shared/global-loader/GlobalLoader.tsx
// Loader global affiché par le LoadingContext
// Affiche un loader en plein écran avec un message optionnel

import './GlobalLoader.scss'

interface GlobalLoaderProps {
  message?: string
}

export default function GlobalLoader({
  message = 'Chargement...',
}: GlobalLoaderProps) {
  return (
    <div
      className="global-loader-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement en cours"
    >
      <div className="global-loader-content">
        <div className="loader-bounce" aria-hidden="true">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
        {message && <p className="loader-message">{message}</p>}
      </div>
    </div>
  )
}
