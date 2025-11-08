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
    <div className="global-loader-overlay">
      <div className="global-loader-content">
        <div className="loader-bounce">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
        {message && <p className="loader-message">{message}</p>}
      </div>
    </div>
  )
}
