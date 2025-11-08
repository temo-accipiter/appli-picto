import './Loader.scss'

export default function Loader() {
  return (
    <div
      className="loader-overlay"
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
