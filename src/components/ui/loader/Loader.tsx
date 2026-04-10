'use client'

import './Loader.scss'

type LoaderProps = {
  variant?: 'fullscreen' | 'inline'
}

export default function Loader({ variant = 'fullscreen' }: LoaderProps) {
  const className = variant === 'inline' ? 'loader-inline' : 'loader-overlay'

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement en cours"
    >
      <div className="loader-bounce" aria-hidden="true">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
      <span className="sr-only">Chargement en cours...</span>
    </div>
  )
}
