'use client'

import './Loader.scss'

type LoaderProps = {
  variant?: 'fullscreen' | 'inline' | 'overlay'
  message?: string
}

export default function Loader({ variant = 'fullscreen', message }: LoaderProps) {
  const dots = (
    <div className="loader-bounce" aria-hidden="true">
      <div className="loader-dot" />
      <div className="loader-dot" />
      <div className="loader-dot" />
    </div>
  )

  if (variant === 'inline') {
    return (
      <div
        className="loader-inline"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Chargement en cours"
      >
        {dots}
        <span className="sr-only">Chargement en cours...</span>
      </div>
    )
  }

  return (
    <div
      className={
        variant === 'overlay'
          ? 'loader-overlay loader-overlay--blur'
          : 'loader-overlay'
      }
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement en cours"
    >
      {variant === 'overlay' ? (
        <div className="loader-overlay__content">
          {dots}
          {message && <p className="loader-message">{message}</p>}
        </div>
      ) : (
        dots
      )}
      <span className="sr-only">Chargement en cours...</span>
    </div>
  )
}
