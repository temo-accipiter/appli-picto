// src/components/shared/global-loader/GlobalLoader.jsx
// Loader global affiché par le LoadingContext
// Affiche un loader en plein écran avec un message optionnel

import PropTypes from 'prop-types'
import './GlobalLoader.scss'

export default function GlobalLoader({ message = 'Chargement...' }) {
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

GlobalLoader.propTypes = {
  message: PropTypes.string,
}
