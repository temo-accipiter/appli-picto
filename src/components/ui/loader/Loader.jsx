import './Loader.scss'

export default function Loader() {
  return (
    <div className="loader-overlay">
      <div className="loader-bounce">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
    </div>
  )
}

// PropTypes pour le composant Loader
Loader.propTypes = {
  // Aucune prop pour ce composant
}
